# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Progressive Web App (PWA) that integrates with the Todoist API v2 to display random overdue tasks. Users can complete, postpone, or edit tasks directly from the interface.

## Core Architecture

- **Frontend**: Vanilla JavaScript with ES6 classes
- **API Integration**: Todoist REST API v2 with Bearer token authentication
- **Storage**: LocalStorage for API key persistence
- **PWA Features**: Service Worker with intelligent caching strategies, Web App Manifest
- **Styling**: CSS with mobile-first responsive design

## Key Components

### TodoistApp Class (`app.js`)
- Main application controller managing state and API interactions
- Handles task filtering (overdue tasks only), random selection with duplicate prevention
- Implements visual loading states for all async operations
- Link formatting: Preserves Todoist-style `[text](url)` links and auto-detects URLs

### Service Worker (`sw.js`)
- Cache-First strategy for static assets (CSS, manifest, icons)
- Network-First strategy for dynamic content (HTML, JS)
- Automatic cache versioning and cleanup of old caches
- Immediate activation with `skipWaiting()` for seamless updates

### Caching Strategy
- Static files use Cache-First for performance
- Dynamic files use Network-First to ensure updates
- Auto-refresh mechanism when new service worker version detected
- Manual cache clearing available via dropdown menu

## Important Implementation Details

### API Key Management
- Stored in localStorage as 'todoist-api-key'
- Never hardcoded in source files
- Input validation and error handling for invalid keys

### Task Operations
- **Complete**: Uses `/tasks/{id}/close` endpoint
- **Postpone**: Updates `due_date` to tomorrow via `/tasks/{id}` endpoint  
- **Edit**: Updates `content` field, preserves original Markdown formatting
- All operations include visual feedback and error recovery

### Mobile Responsiveness
- Task meta section (project/date) uses flexbox with proper centering on mobile
- Edit functionality uses modal popup instead of inline editing for better UX
- Button layouts stack vertically on narrow screens

## Development Notes

- No build process required - static files served directly
- PWA manifest configured for GitHub Pages deployment (`/random-todoist/` base path)
- Service worker handles offline functionality and automatic updates
- All async operations implement proper loading states and error handling