# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive photo migration system that supports migrating photos from multiple social platforms (Facebook, Instagram, Flickr, 500px) to Google Photos. It's built with React + Vite and features a sophisticated API integration layer with real-time progress tracking.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server (Vite on port 3000)
- `npm run build` - Build for production
- `npm run lint` - Run ESLint checks
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run preview` - Preview production build

### Testing Requirements
- Target 85%+ code coverage (configured in jest.config.js)
- Use Jest with jsdom environment for React component testing
- Testing utilities: @testing-library/react, @testing-library/jest-dom
- Test files located in `__tests__` directories or `.test.jsx` files

### Code Quality
- ESLint configured with React hooks and React Refresh plugins
- Prettier for code formatting
- Coverage thresholds: 70% for branches, functions, lines, statements

## Core Architecture

### State Management Pattern
- **React Context API + useReducer**: Primary state management approach
- **AuthContext**: Multi-platform authentication with secure token storage
- **ProgressContext**: Complex migration progress state with reducer pattern
- **ToastContext**: User notifications system

### API Integration Architecture
- **Adapter Pattern**: Unified interface for 5 platforms (Google Photos, Flickr, Instagram, Facebook, 500px)
- **Factory Pattern**: Dynamic adapter creation via ApiAdapterFactory
- **Repository Pattern**: PhotoRepository for data access abstraction
- **Service Layer**: PhotoApiService as main orchestration layer

### Component Organization
```
src/components/
├── auth/           # Authentication components (OAuth, login panels)
├── layout/         # Header, Footer, Layout components
├── progress/       # Progress tracking UI (ProgressBar, TaskList, ErrorLog)
├── ui/            # Reusable UI components (Button, Modal, Toast, Card)
└── common/        # Shared utility components
```

### Key Services
- **SocketService**: WebSocket real-time communication for progress updates
- **PhotoApiService**: Main API orchestration with rate limiting and caching
- **FileProcessingPipeline**: Handles download, upload, and processing workflows
- **AuthenticationPanel**: Multi-platform OAuth management

## Technical Stack

### Core Technologies
- **React 18** with hooks-based architecture
- **Vite** for build tooling and development server
- **React Router DOM** for client-side routing
- **Tailwind CSS** for styling
- **Framer Motion** for animations

### API Integration
- **googleapis**: Google Photos API integration
- **flickr-sdk**: Flickr API integration
- **axios**: HTTP client for API requests
- **bottleneck**: Rate limiting management
- **lru-cache**: Multi-level caching system

### Real-time Features
- **socket.io-client**: WebSocket communication
- **react-toastify**: Toast notifications

### Testing & Quality
- **Jest**: Testing framework with jsdom environment
- **@testing-library/react**: React component testing utilities
- **ESLint**: Code linting with React-specific rules

## API Layer Design Patterns

### Adapter Pattern Implementation
Each platform implements the `PhotoApiAdapter` interface:
- **GooglePhotosAdapter**: Google Photos API wrapper
- **FlickrAdapter**: Flickr API wrapper
- **InstagramAdapter**: Instagram Graph API wrapper
- **FacebookAdapter**: Facebook Graph API wrapper
- **FiveHundredPxAdapter**: 500px API wrapper

### Rate Limiting Strategy
- **Platform-specific limits**: Each adapter has custom rate limiting
- **Global rate limiting**: Cross-platform request coordination
- **Adaptive algorithms**: Dynamic adjustment based on API responses
- **Bottleneck.js integration**: Robust queue management

### Data Normalization
- **Standardized data structures**: Consistent photo/album objects across platforms
- **EXIF data normalization**: Unified metadata handling
- **DataNormalizer classes**: AlbumNormalizer, PhotoNormalizer, UserProfileNormalizer

### Caching Architecture
- **Multi-tier caching**: Memory, session, and persistent caching
- **Configurable TTL**: Per-operation cache timing
- **LRU eviction**: Memory-efficient cache management
- **Cache metrics**: Performance monitoring and optimization

## Progress Tracking System

### Real-time Communication
- **WebSocket integration**: Socket.io for live progress updates
- **Event-driven architecture**: File-level progress events
- **Connection resilience**: Automatic reconnection with exponential backoff

### Progress Context Design
- **Complex state management**: useReducer for migration lifecycle
- **File-level tracking**: Individual file status, progress, errors
- **Statistical calculations**: Success rates, speed metrics, time estimation
- **Error management**: Comprehensive error logging and recovery

### UI Components
- **ProgressBar**: Multi-variant progress visualization (linear, circular, multi-stage)
- **TaskList**: File listing with search, filter, sort capabilities
- **ErrorLog**: Error tracking with retry functionality
- **Summary**: Statistical overview with charts
- **ControlPanel**: Migration control interface

## Security Considerations

### Token Management
- **Secure storage**: Separation of sensitive tokens from user data
- **Token validation**: Automatic refresh and validation scheduling
- **OAuth flow security**: Proper state validation and CSRF protection

### API Security
- **Rate limiting**: Prevents API abuse and quota exhaustion
- **Error handling**: Prevents information disclosure through errors
- **Logging**: Structured logging without sensitive data exposure

## File Processing Pipeline

### Migration Workflow
1. **Platform Authentication**: OAuth connection to source/target platforms
2. **Photo Discovery**: Fetch and normalize photo metadata
3. **Queue Management**: Batched processing with priority handling
4. **Download/Upload**: Parallel processing with progress tracking
5. **Data Normalization**: EXIF, metadata, and filename standardization
6. **Error Recovery**: Comprehensive retry logic and error handling

### Performance Optimization
- **Parallel processing**: Concurrent file operations
- **Memory management**: Efficient handling of large file transfers
- **Request optimization**: Batch operations where possible
- **Performance monitoring**: Real-time metrics and bottleneck identification

## Development Workflow Integration

### Taskmaster Integration
- Uses Taskmaster for project management with tagged task lists
- MCP server integration for AI-assisted development
- Complex task breakdown with dependency management
- Progress tracking for development tasks

### Testing Strategy
- **Unit tests**: Individual component and service testing
- **Integration tests**: API adapter and service integration
- **E2E tests**: Full migration workflow testing
- **Performance tests**: Load and stress testing for API operations

## Environment Configuration

### Required Environment Variables
```env
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_FACEBOOK_APP_ID=your_facebook_app_id
VITE_API_BASE_URL=your_api_base_url
```

### Configuration Files
- `jest.config.js`: Jest testing configuration
- `tailwind.config.js`: Tailwind CSS customization
- `vite.config.js`: Vite build configuration
- `postcss.config.js`: PostCSS processing

## Code Conventions

### Component Patterns
- **Functional components**: Use hooks-based approach
- **Custom hooks**: Extract reusable logic (useAuth, useSocketProgress, useToast)
- **Compound components**: Complex UI with sub-component architecture
- **Higher-order patterns**: ProtectedRoute for authentication guards

### State Management
- **Context providers**: Wrap application sections with relevant contexts
- **useReducer**: For complex state with multiple action types
- **useMemo/useCallback**: Performance optimization for derived state and functions
- **Error boundaries**: Graceful error handling in React components

### API Integration
- **Adapter pattern**: Consistent interface across different platforms
- **Error handling**: Comprehensive try-catch with specific error types
- **Logging**: Structured logging with appropriate log levels
- **Performance monitoring**: Built-in metrics collection

## Key File Locations

### Core Services
- `src/services/api/PhotoApiService.js`: Main API orchestration
- `src/services/api/adapters/`: Platform-specific adapters
- `src/services/SocketService.js`: WebSocket communication
- `src/services/fileProcessing/`: File handling pipeline

### State Management
- `src/contexts/AuthContext.jsx`: Authentication state
- `src/contexts/ProgressContext.jsx`: Migration progress state
- `src/contexts/ToastContext.js`: Notification state

### UI Components
- `src/components/ui/`: Reusable UI components with comprehensive tests
- `src/components/progress/`: Progress tracking interface
- `src/components/auth/`: Authentication interface

This system is production-ready with enterprise-level architecture patterns, comprehensive testing, security considerations, and real-time communication capabilities.