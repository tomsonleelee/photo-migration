// 批次錯誤處理工具
import { ErrorClassifier } from './errors';
import { globalRetryManager, RetryConfigs } from './retryManager';

// 批次操作錯誤聚合器
export class BatchErrorAggregator {
  constructor(options = {}) {
    this.options = {
      maxBatchSize: 100,
      aggregationWindow: 5000, // 5秒聚合窗口
      similarityThreshold: 0.8,
      autoRetryEnabled: true,
      retryConfig: RetryConfigs.network,
      ...options
    };
    
    this.pendingErrors = [];
    this.aggregatedBatches = [];
    this.aggregationTimer = null;
    this.onBatchComplete = null;
    this.onErrorAggregated = null;
  }

  // 添加錯誤到批次
  addError(error, context = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      error,
      context: {
        ...context,
        timestamp: new Date(),
        batchId: context.batchId || null,
        operationId: context.operationId || null
      },
      classification: ErrorClassifier.classify(error),
      retryCount: 0,
      resolved: false
    };

    this.pendingErrors.push(errorEntry);

    // 如果達到最大批次大小，立即處理
    if (this.pendingErrors.length >= this.options.maxBatchSize) {
      this.processAggregation();
    } else {
      // 設置聚合定時器
      this.scheduleAggregation();
    }

    // 觸發錯誤添加回調
    if (this.onErrorAggregated) {
      this.onErrorAggregated(errorEntry);
    }

    return errorEntry.id;
  }

  // 批量添加錯誤
  addErrors(errors, batchContext = {}) {
    const batchId = this.generateBatchId();
    const errorIds = [];

    errors.forEach(({ error, context = {} }) => {
      const errorId = this.addError(error, {
        ...context,
        ...batchContext,
        batchId
      });
      errorIds.push(errorId);
    });

    return { batchId, errorIds };
  }

  // 排程聚合處理
  scheduleAggregation() {
    if (this.aggregationTimer) {
      return; // 定時器已設置
    }

    this.aggregationTimer = setTimeout(() => {
      this.processAggregation();
    }, this.options.aggregationWindow);
  }

  // 處理錯誤聚合
  processAggregation() {
    if (this.aggregationTimer) {
      clearTimeout(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    if (this.pendingErrors.length === 0) {
      return;
    }

    // 複製並清空待處理錯誤
    const errorsToProcess = [...this.pendingErrors];
    this.pendingErrors = [];

    // 執行聚合邏輯
    const aggregatedBatch = this.aggregateErrors(errorsToProcess);
    this.aggregatedBatches.push(aggregatedBatch);

    // 自動重試邏輯
    if (this.options.autoRetryEnabled) {
      this.scheduleRetry(aggregatedBatch);
    }

    // 觸發批次完成回調
    if (this.onBatchComplete) {
      this.onBatchComplete(aggregatedBatch);
    }

    return aggregatedBatch;
  }

  // 聚合錯誤邏輯
  aggregateErrors(errors) {
    const batch = {
      id: this.generateBatchId(),
      timestamp: new Date(),
      totalErrors: errors.length,
      errors: errors,
      groups: [],
      summary: {},
      retryable: false,
      priority: 'MEDIUM'
    };

    // 按相似性分組錯誤
    const groups = this.groupSimilarErrors(errors);
    batch.groups = groups;

    // 生成摘要統計
    batch.summary = this.generateSummary(errors, groups);

    // 判斷是否可重試
    batch.retryable = errors.some(e => e.classification.retryable);

    // 計算優先級
    batch.priority = this.calculateBatchPriority(errors);

    return batch;
  }

  // 將相似錯誤分組
  groupSimilarErrors(errors) {
    const groups = [];
    const processed = new Set();

    errors.forEach((error, index) => {
      if (processed.has(index)) return;

      const group = {
        id: this.generateGroupId(),
        representative: error,
        errors: [error],
        pattern: this.extractErrorPattern(error),
        count: 1,
        contexts: [error.context]
      };

      processed.add(index);

      // 查找相似錯誤
      errors.forEach((otherError, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return;

        if (this.areErrorsSimilar(error, otherError)) {
          group.errors.push(otherError);
          group.contexts.push(otherError.context);
          group.count++;
          processed.add(otherIndex);
        }
      });

      groups.push(group);
    });

    // 按錯誤數量排序
    return groups.sort((a, b) => b.count - a.count);
  }

  // 判斷錯誤是否相似
  areErrorsSimilar(error1, error2) {
    // 錯誤類型相同
    if (error1.error.name !== error2.error.name) {
      return false;
    }

    // 錯誤代碼相同
    if (error1.error.code !== error2.error.code) {
      return false;
    }

    // 計算消息相似度
    const similarity = this.calculateTextSimilarity(
      error1.error.message,
      error2.error.message
    );

    return similarity >= this.options.similarityThreshold;
  }

  // 計算文本相似度（簡單的 Jaccard 相似度）
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // 提取錯誤模式
  extractErrorPattern(errorEntry) {
    return {
      errorType: errorEntry.error.name,
      errorCode: errorEntry.error.code,
      category: errorEntry.classification.category,
      severity: errorEntry.classification.severity,
      component: errorEntry.context.component,
      operation: errorEntry.context.operation
    };
  }

  // 生成批次摘要
  generateSummary(errors, groups) {
    const summary = {
      totalErrors: errors.length,
      uniquePatterns: groups.length,
      byCategory: {},
      bySeverity: {},
      byComponent: {},
      retryableCount: 0,
      criticalCount: 0
    };

    errors.forEach(error => {
      // 按類別統計
      const category = error.classification.category;
      summary.byCategory[category] = (summary.byCategory[category] || 0) + 1;

      // 按嚴重程度統計
      const severity = error.classification.severity;
      summary.bySeverity[severity] = (summary.bySeverity[severity] || 0) + 1;

      // 按組件統計
      const component = error.context.component;
      summary.byComponent[component] = (summary.byComponent[component] || 0) + 1;

      // 可重試計數
      if (error.classification.retryable) {
        summary.retryableCount++;
      }

      // 關鍵錯誤計數
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        summary.criticalCount++;
      }
    });

    return summary;
  }

  // 計算批次優先級
  calculateBatchPriority(errors) {
    const criticalCount = errors.filter(e => 
      e.classification.severity === 'HIGH' || 
      e.classification.severity === 'CRITICAL'
    ).length;

    const criticalRatio = criticalCount / errors.length;

    if (criticalRatio > 0.5) return 'CRITICAL';
    if (criticalRatio > 0.2) return 'HIGH';
    if (errors.length > 50) return 'HIGH';
    
    return 'MEDIUM';
  }

  // 排程重試
  async scheduleRetry(batch) {
    if (!batch.retryable) return;

    const retryableErrors = batch.errors.filter(e => e.classification.retryable);
    
    for (const errorEntry of retryableErrors) {
      try {
        await globalRetryManager.executeWithRetry(
          () => this.retryOperation(errorEntry),
          this.options.retryConfig
        );
        
        errorEntry.resolved = true;
        errorEntry.retryCount++;
      } catch (retryError) {
        errorEntry.retryCount++;
        console.warn(`Retry failed for error ${errorEntry.id}:`, retryError);
      }
    }
  }

  // 重試操作（需要被子類實現）
  async retryOperation(_errorEntry) {
    throw new Error('retryOperation must be implemented by subclass');
  }

  // 獲取批次統計
  getBatchStats() {
    const allErrors = [
      ...this.pendingErrors,
      ...this.aggregatedBatches.flatMap(b => b.errors)
    ];

    return {
      totalBatches: this.aggregatedBatches.length,
      pendingErrors: this.pendingErrors.length,
      totalErrors: allErrors.length,
      resolvedErrors: allErrors.filter(e => e.resolved).length,
      retryableErrors: allErrors.filter(e => e.classification.retryable).length
    };
  }

  // 獲取錯誤分析報告
  getAnalysisReport() {
    const stats = this.getBatchStats();
    const recentBatches = this.aggregatedBatches.slice(-10);
    
    return {
      overview: stats,
      recentBatches: recentBatches.map(batch => ({
        id: batch.id,
        timestamp: batch.timestamp,
        errorCount: batch.totalErrors,
        uniquePatterns: batch.groups.length,
        priority: batch.priority,
        resolved: batch.errors.filter(e => e.resolved).length
      })),
      topErrorPatterns: this.getTopErrorPatterns(),
      recommendations: this.generateRecommendations()
    };
  }

  // 獲取最常見的錯誤模式
  getTopErrorPatterns() {
    const patternCounts = {};
    
    this.aggregatedBatches.forEach(batch => {
      batch.groups.forEach(group => {
        const pattern = JSON.stringify(group.pattern);
        patternCounts[pattern] = (patternCounts[pattern] || 0) + group.count;
      });
    });

    return Object.entries(patternCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({
        pattern: JSON.parse(pattern),
        count
      }));
  }

  // 生成改進建議
  generateRecommendations() {
    const patterns = this.getTopErrorPatterns();
    const recommendations = [];

    patterns.forEach(({ pattern, count }) => {
      if (pattern.category === 'NetworkError' && count > 10) {
        recommendations.push({
          type: 'performance',
          message: '考慮增加網路重試次數或改善網路錯誤處理',
          priority: 'HIGH'
        });
      }

      if (pattern.category === 'ValidationError' && count > 5) {
        recommendations.push({
          type: 'validation',
          message: '考慮改善客戶端驗證邏輯',
          priority: 'MEDIUM'
        });
      }

      if (pattern.severity === 'HIGH' && count > 3) {
        recommendations.push({
          type: 'critical',
          message: `組件 ${pattern.component} 出現高頻關鍵錯誤，需要緊急處理`,
          priority: 'CRITICAL'
        });
      }
    });

    return recommendations;
  }

  // 工具方法
  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateGroupId() {
    return `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 清理舊批次
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24小時
    const cutoff = new Date(Date.now() - maxAge);
    this.aggregatedBatches = this.aggregatedBatches.filter(
      batch => batch.timestamp > cutoff
    );
  }
}

// 預設批次錯誤聚合器實例
export const globalBatchErrorHandler = new BatchErrorAggregator();

// 導出類
export default BatchErrorAggregator;