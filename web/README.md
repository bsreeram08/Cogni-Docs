# Documentation MCP Web Interface

A modern React-based web application for managing documentation sets for the Documentation MCP server. This interface allows users to create, upload, and manage document collections that can be queried via the MCP (Model Context Protocol) server.

## Features

- **🔐 Authentication System**: Secure user login and registration
- **📊 Dashboard**: Overview of all documentation sets
- **📁 Document Set Management**: Create and organize documentation collections
- **📤 File Upload**: Support for PDF, HTML, and TXT files
- **🔗 MCP Integration**: Easy-to-copy document set IDs for MCP client configuration
- **📱 Responsive Design**: Modern UI with Tailwind CSS and shadcn/ui components

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui with Tailwind CSS
- **Routing**: React Router v7
- **State Management**: React Context API
- **HTTP Client**: Fetch API
- **Build Tool**: Vite with Hot Module Replacement

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- The Documentation MCP upload server running on port 3001
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
