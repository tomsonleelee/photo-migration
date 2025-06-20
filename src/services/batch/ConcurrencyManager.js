// 並發處理管理器 - 管理批次處理的並發配置和控制
import { EventEmitter } from 'events';

// 並發策略
export const CONCURRENCY_STRATEGIES = {
  FIXED: 'fixed',           // 固定並發數
  ADAPTIVE: 'adaptive',     // 自適應並發
  RESOURCE_BASED: 'resource_based', // 基於資源的並發
  TIME_BASED: 'time_based'  // 基於時間的並發
};

// 資源類型
export const RESOURCE_TYPES = {
  CPU: 'cpu',
  MEMORY: 'memory',
  NETWORK: 'network',
  DISK: 'disk'
};

export class ConcurrencyManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      strategy: options.strategy || CONCURRENCY_STRATEGIES.ADAPTIVE,
      maxConcurrency: options.maxConcurrency || 10,
      minConcurrency: options.minConcurrency || 1,
      adaptiveWindow: options.adaptiveWindow || 60000, // 1分鐘
      resourceThresholds: {
        cpu: options.cpuThreshold || 80,
        memory: options.memoryThreshold || 85,
        network: options.networkThreshold || 90,
        disk: options.diskThreshold || 75
      },
      timeBasedRules: options.timeBasedRules || [],
      performanceMetrics: {
        targetThroughput: options.targetThroughput || 100, // 每分鐘
        maxLatency: options.maxLatency || 5000, // 5秒
        errorRateThreshold: options.errorRateThreshold || 0.05 // 5%
      },
      ...options
    };
    
    // 運行時狀態
    this.currentConcurrency = this.config.minConcurrency;
    this.activeTasks = new Set();
    this.taskHistory = [];
    this.performanceData = {
      throughput: 0,
      averageLatency: 0,
      errorRate: 0,
      lastUpdate: Date.now()
    };
    
    // 資源監控
    this.resourceUsage = {
      cpu: 0,
      memory: 0,
      network: 0,
      disk: 0
    };
    
    // 統計資訊
    this.statistics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      concurrencyChanges: 0,
      averageConcurrency: 0,
      peakConcurrency: 0,
      optimalConcurrency: this.config.minConcurrency
    };
    
    this.initialize();
  }

  // 初始化並發管理器
  initialize() {
    try {
      // 啟動性能監控
      this.startPerformanceMonitoring();
      
      // 啟動資源監控
      this.startResourceMonitoring();
      
      // 設定並發調整定時器
      this.startConcurrencyAdjustment();
      
      this.emit('initialized', {
        strategy: this.config.strategy,
        initialConcurrency: this.currentConcurrency
      });
      
    } catch (error) {
      this.emit('error', {
        type: 'initialization_failed',
        error: error.message
      });
      throw error;
    }
  }

  // 獲取當前並發數
  getCurrentConcurrency() {
    return this.currentConcurrency;
  }

  // 設定並發數
  setConcurrency(concurrency, reason = 'manual') {
    const oldConcurrency = this.currentConcurrency;
    const newConcurrency = Math.max(
      this.config.minConcurrency,
      Math.min(this.config.maxConcurrency, concurrency)
    );
    
    if (newConcurrency !== oldConcurrency) {
      this.currentConcurrency = newConcurrency;
      this.statistics.concurrencyChanges++;
      
      // 更新平均並發數
      this.updateAverageConcurrency();
      
      // 更新峰值並發數
      if (newConcurrency > this.statistics.peakConcurrency) {
        this.statistics.peakConcurrency = newConcurrency;
      }
      
      this.emit('concurrency-changed', {
        oldConcurrency,
        newConcurrency,
        reason,
        timestamp: new Date().toISOString()
      });
    }
    
    return this.currentConcurrency;
  }

  // 檢查是否可以執行新任務
  canExecuteTask() {
    return this.activeTasks.size < this.currentConcurrency;
  }

  // 等待可用槽位
  async waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.canExecuteTask()) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }

  // 開始執行任務
  startTask(taskId, metadata = {}) {
    if (!this.canExecuteTask()) {
      throw new Error('No available concurrency slots');
    }
    
    const task = {
      id: taskId,
      startTime: Date.now(),
      metadata
    };
    
    this.activeTasks.add(task);
    this.statistics.totalTasks++;
    
    this.emit('task-started', {
      taskId,
      concurrency: this.activeTasks.size,
      metadata
    });
    
    return task;
  }

  // 完成任務
  completeTask(taskId, result = {}) {
    const task = this.findTask(taskId);
    if (!task) return;
    
    const endTime = Date.now();
    const duration = endTime - task.startTime;
    
    this.activeTasks.delete(task);
    this.statistics.completedTasks++;
    
    // 記錄任務歷史
    this.recordTaskHistory({
      ...task,
      endTime,
      duration,
      status: 'completed',
      result
    });
    
    this.emit('task-completed', {
      taskId,
      duration,
      concurrency: this.activeTasks.size,
      result
    });
    
    // 更新性能數據
    this.updatePerformanceMetrics();
  }

  // 任務失敗
  failTask(taskId, error) {
    const task = this.findTask(taskId);
    if (!task) return;
    
    const endTime = Date.now();
    const duration = endTime - task.startTime;
    
    this.activeTasks.delete(task);
    this.statistics.failedTasks++;
    
    // 記錄任務歷史
    this.recordTaskHistory({
      ...task,
      endTime,
      duration,
      status: 'failed',
      error: error.message
    });
    
    this.emit('task-failed', {
      taskId,
      duration,
      concurrency: this.activeTasks.size,
      error: error.message
    });
    
    // 更新性能數據
    this.updatePerformanceMetrics();
  }

  // 查找任務
  findTask(taskId) {
    for (const task of this.activeTasks) {
      if (task.id === taskId) {
        return task;
      }
    }
    return null;
  }

  // 記錄任務歷史
  recordTaskHistory(taskRecord) {
    this.taskHistory.push(taskRecord);
    
    // 限制歷史記錄長度
    if (this.taskHistory.length > 1000) {
      this.taskHistory = this.taskHistory.slice(-1000);
    }
  }

  // 更新性能指標
  updatePerformanceMetrics() {
    const now = Date.now();
    const windowSize = this.config.adaptiveWindow;
    const cutoff = now - windowSize;
    
    // 過濾最近的任務
    const recentTasks = this.taskHistory.filter(task => 
      task.endTime > cutoff
    );
    
    if (recentTasks.length === 0) {
      return;
    }
    
    // 計算吞吐量（每分鐘完成的任務數）
    const completedTasks = recentTasks.filter(task => 
      task.status === 'completed'
    );
    this.performanceData.throughput = (completedTasks.length / windowSize) * 60000;
    
    // 計算平均延遲
    if (completedTasks.length > 0) {
      const totalDuration = completedTasks.reduce((sum, task) => sum + task.duration, 0);
      this.performanceData.averageLatency = totalDuration / completedTasks.length;
    }
    
    // 計算錯誤率
    const failedTasks = recentTasks.filter(task => 
      task.status === 'failed'
    );
    this.performanceData.errorRate = recentTasks.length > 0 ? 
      failedTasks.length / recentTasks.length : 0;
    
    this.performanceData.lastUpdate = now;
    
    this.emit('performance-updated', this.performanceData);
  }

  // 啟動性能監控
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 10000); // 每10秒更新一次
  }

  // 啟動資源監控
  startResourceMonitoring() {
    // 在瀏覽器環境中，我們模擬資源使用情況
    setInterval(() => {
      this.updateResourceUsage();
    }, 5000); // 每5秒檢查一次
  }

  // 更新資源使用情況
  updateResourceUsage() {
    // 模擬資源使用情況（在實際環境中應該使用真實的系統監控）
    const concurrencyRatio = this.activeTasks.size / this.config.maxConcurrency;
    
    // 模擬 CPU 使用率
    this.resourceUsage.cpu = Math.min(100, 
      20 + (concurrencyRatio * 60) + (Math.random() * 10)
    );
    
    // 模擬內存使用率
    this.resourceUsage.memory = Math.min(100,
      30 + (concurrencyRatio * 40) + (Math.random() * 15)
    );
    
    // 模擬網絡使用率
    this.resourceUsage.network = Math.min(100,
      10 + (concurrencyRatio * 50) + (Math.random() * 20)
    );
    
    // 模擬磁盤使用率
    this.resourceUsage.disk = Math.min(100,
      15 + (concurrencyRatio * 30) + (Math.random() * 10)
    );
    
    this.emit('resource-usage-updated', this.resourceUsage);
  }

  // 啟動並發調整
  startConcurrencyAdjustment() {
    setInterval(() => {
      this.adjustConcurrency();
    }, 15000); // 每15秒調整一次
  }

  // 調整並發數
  adjustConcurrency() {
    switch (this.config.strategy) {
      case CONCURRENCY_STRATEGIES.ADAPTIVE:
        this.adaptiveConcurrencyAdjustment();
        break;
      case CONCURRENCY_STRATEGIES.RESOURCE_BASED:
        this.resourceBasedConcurrencyAdjustment();
        break;
      case CONCURRENCY_STRATEGIES.TIME_BASED:
        this.timeBasedConcurrencyAdjustment();
        break;
      case CONCURRENCY_STRATEGIES.FIXED:
      default:
        // 固定並發數不需要調整
        break;
    }
  }

  // 自適應並發調整
  adaptiveConcurrencyAdjustment() {
    const { performanceMetrics } = this.config;
    const { throughput, averageLatency, errorRate } = this.performanceData;
    
    let adjustment = 0;
    let reason = [];
    
    // 基於吞吐量調整
    if (throughput < performanceMetrics.targetThroughput * 0.8) {
      adjustment += 1;
      reason.push('low_throughput');
    } else if (throughput > performanceMetrics.targetThroughput * 1.2) {
      adjustment -= 1;
      reason.push('high_throughput');
    }
    
    // 基於延遲調整
    if (averageLatency > performanceMetrics.maxLatency) {
      adjustment -= 1;
      reason.push('high_latency');
    } else if (averageLatency < performanceMetrics.maxLatency * 0.5) {
      adjustment += 1;
      reason.push('low_latency');
    }
    
    // 基於錯誤率調整
    if (errorRate > performanceMetrics.errorRateThreshold) {
      adjustment -= 2;
      reason.push('high_error_rate');
    }
    
    // 基於資源使用情況微調
    const avgResourceUsage = (
      this.resourceUsage.cpu + 
      this.resourceUsage.memory + 
      this.resourceUsage.network + 
      this.resourceUsage.disk
    ) / 4;
    
    if (avgResourceUsage > 85) {
      adjustment -= 1;
      reason.push('high_resource_usage');
    } else if (avgResourceUsage < 50) {
      adjustment += 1;
      reason.push('low_resource_usage');
    }
    
    if (adjustment !== 0) {
      const newConcurrency = this.currentConcurrency + adjustment;
      this.setConcurrency(newConcurrency, `adaptive: ${reason.join(', ')}`);
    }
  }

  // 基於資源的並發調整
  resourceBasedConcurrencyAdjustment() {
    const { resourceThresholds } = this.config;
    let shouldDecrease = false;
    let shouldIncrease = true;
    const reasons = [];
    
    // 檢查每個資源類型
    for (const [resource, usage] of Object.entries(this.resourceUsage)) {
      const threshold = resourceThresholds[resource];
      
      if (usage > threshold) {
        shouldDecrease = true;
        shouldIncrease = false;
        reasons.push(`${resource}_high`);
      } else if (usage > threshold * 0.7) {
        shouldIncrease = false;
      }
    }
    
    if (shouldDecrease) {
      const newConcurrency = Math.max(
        this.config.minConcurrency,
        this.currentConcurrency - 1
      );
      this.setConcurrency(newConcurrency, `resource_based: ${reasons.join(', ')}`);
    } else if (shouldIncrease && this.currentConcurrency < this.config.maxConcurrency) {
      const newConcurrency = this.currentConcurrency + 1;
      this.setConcurrency(newConcurrency, 'resource_based: resources_available');
    }
  }

  // 基於時間的並發調整
  timeBasedConcurrencyAdjustment() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday
    
    for (const rule of this.config.timeBasedRules) {
      if (this.matchesTimeRule(rule, currentHour, currentDay)) {
        this.setConcurrency(rule.concurrency, `time_based: ${rule.name}`);
        break;
      }
    }
  }

  // 檢查時間規則是否匹配
  matchesTimeRule(rule, hour, day) {
    // 檢查小時範圍
    if (rule.hours && !this.inRange(hour, rule.hours)) {
      return false;
    }
    
    // 檢查星期幾
    if (rule.days && !rule.days.includes(day)) {
      return false;
    }
    
    return true;
  }

  // 檢查數值是否在範圍內
  inRange(value, range) {
    if (Array.isArray(range)) {
      return range.includes(value);
    } else if (typeof range === 'object') {
      return value >= range.start && value <= range.end;
    }
    return false;
  }

  // 更新平均並發數
  updateAverageConcurrency() {
    const { totalTasks, completedTasks, failedTasks } = this.statistics;
    const processedTasks = completedTasks + failedTasks;
    
    if (processedTasks > 0) {
      this.statistics.averageConcurrency = 
        ((this.statistics.averageConcurrency * (processedTasks - 1)) + this.currentConcurrency) / processedTasks;
    }
  }

  // 計算最優並發數
  calculateOptimalConcurrency() {
    const recentTasks = this.taskHistory.slice(-100); // 最近100個任務
    
    if (recentTasks.length < 10) {
      return this.currentConcurrency;
    }
    
    // 按並發數分組任務
    const concurrencyGroups = {};
    for (const task of recentTasks) {
      const concurrency = task.metadata?.concurrency || this.currentConcurrency;
      if (!concurrencyGroups[concurrency]) {
        concurrencyGroups[concurrency] = [];
      }
      concurrencyGroups[concurrency].push(task);
    }
    
    // 計算每個並發數的性能指標
    let bestConcurrency = this.currentConcurrency;
    let bestScore = 0;
    
    for (const [concurrency, tasks] of Object.entries(concurrencyGroups)) {
      if (tasks.length < 5) continue; // 樣本太少
      
      const completedTasks = tasks.filter(t => t.status === 'completed');
      const avgLatency = completedTasks.reduce((sum, t) => sum + t.duration, 0) / completedTasks.length;
      const errorRate = (tasks.length - completedTasks.length) / tasks.length;
      const throughput = completedTasks.length / tasks.length;
      
      // 計算綜合分數（可以根據需要調整權重）
      const score = (throughput * 0.5) + ((1 / avgLatency) * 0.3) + ((1 - errorRate) * 0.2);
      
      if (score > bestScore) {
        bestScore = score;
        bestConcurrency = parseInt(concurrency);
      }
    }
    
    this.statistics.optimalConcurrency = bestConcurrency;
    return bestConcurrency;
  }

  // 獲取性能統計
  getPerformanceStatistics() {
    return {
      ...this.performanceData,
      currentConcurrency: this.currentConcurrency,
      activeTasks: this.activeTasks.size,
      resourceUsage: { ...this.resourceUsage },
      optimalConcurrency: this.calculateOptimalConcurrency()
    };
  }

  // 獲取統計資訊
  getStatistics() {
    return {
      ...this.statistics,
      currentConcurrency: this.currentConcurrency,
      activeTasks: this.activeTasks.size,
      taskHistorySize: this.taskHistory.length,
      resourceUsage: { ...this.resourceUsage },
      performance: { ...this.performanceData }
    };
  }

  // 重置統計
  resetStatistics() {
    this.statistics = {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      concurrencyChanges: 0,
      averageConcurrency: this.currentConcurrency,
      peakConcurrency: this.currentConcurrency,
      optimalConcurrency: this.currentConcurrency
    };
    
    this.taskHistory = [];
    this.performanceData = {
      throughput: 0,
      averageLatency: 0,
      errorRate: 0,
      lastUpdate: Date.now()
    };
    
    this.emit('statistics-reset');
  }

  // 更新配置
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // 重新應用並發限制
    if (newConfig.maxConcurrency || newConfig.minConcurrency) {
      const newConcurrency = Math.max(
        this.config.minConcurrency,
        Math.min(this.config.maxConcurrency, this.currentConcurrency)
      );
      this.setConcurrency(newConcurrency, 'config_update');
    }
    
    this.emit('config-updated', this.config);
  }

  // 關閉並發管理器
  shutdown() {
    // 等待所有活動任務完成
    return new Promise((resolve) => {
      const checkActiveTasks = () => {
        if (this.activeTasks.size === 0) {
          this.emit('shutdown');
          resolve();
        } else {
          setTimeout(checkActiveTasks, 1000);
        }
      };
      checkActiveTasks();
    });
  }
}

export default ConcurrencyManager;