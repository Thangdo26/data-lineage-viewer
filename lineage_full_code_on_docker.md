# Data Lineage Viewer - Full Source Code với Docker

## 📁 Cấu trúc thư mục

```
data-lineage-viewer/
├── index.html           # ⚠️ QUAN TRỌNG: Phải ở root, không phải trong public/
├── public/
│   └── lineage.csv     # File CSV của bạn
|   └── schema.csv 
├── src/
│   ├── App.jsx
│   ├── components/
│   │   └── DataLineageViewer.jsx
|   |   └── TableSchemaModal.jsx
│   ├── index.js
│   └── index.css
├── nginx/
│   └── nginx.conf
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── Dockerfile
├── .dockerignore
├── docker-compose.yml
└── README.md
```

## 🐳 1. Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

## 🚫 2. .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.DS_Store
dist
.vscode
```

## 🐳 3. docker-compose.yml

```yaml
version: '3.8'

services:
  data-lineage-viewer:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: data-lineage-viewer
    ports:
      - "3000:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    volumes:
      # Mount your CSV file
      - ./public/lineage.csv:/usr/share/nginx/html/lineage.csv:ro
```

## ⚙️ 4. nginx/nginx.conf

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## 📦 5. package.json

```json
{
  "name": "data-lineage-viewer",
  "version": "1.0.0",
  "description": "Data Lineage Visualization Tool",
  "private": true,
  "type": "module",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "vite": "^4.3.9"
  },
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 🎨 6. tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## ⚙️ 7. vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  }
})
```

## 🎯 8. postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 📄 9. index.html (ROOT - Quan trọng!)

**⚠️ File này phải đặt ở thư mục gốc (root), KHÔNG phải trong public/**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Data Lineage Visualization Tool" />
    <title>Data Lineage Viewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

## 🎨 10. src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

## 🚀 11. src/index.js

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## 📱 12. src/App.jsx

```jsx
import React from 'react';
import DataLineageViewer from './components/DataLineageViewer';

function App() {
  return (
    <div className="App">
      <DataLineageViewer />
    </div>
  );
}

export default App;
```

## 🎯 13. src/components/DataLineageViewer.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Database, FileText, Table, Download, Filter } from 'lucide-react';
import Papa from 'papaparse';

const DataLineageViewer = () => {
  const [lineageData, setLineageData] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('all');

  useEffect(() => {
    loadCSVFile();
  }, []);

  const loadCSVFile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/lineage.csv');
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processLineageData(results.data);
          setLoading(false);
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      setError(`Error loading CSV file: ${err.message}`);
      setLoading(false);
    }
  };

  const extractDatabase = (tableName) => {
    const match = tableName.match(/\((.+?)\.db\)/);
    return match ? match[1] : 'unknown';
  };

  const processLineageData = (data) => {
    const relationships = [];
    const dbSet = new Set();
    
    data.forEach(row => {
      const source = row.source_table?.trim();
      const sourceType = row.source_type?.trim();
      const dest = row.destination_table?.trim();
      const destType = row.destination_type?.trim();
      const notebook = row.notebook_name?.trim();
      
      if (source && dest) {
        relationships.push({
          notebook,
          source,
          sourceType,
          destination: dest,
          destinationType: destType
        });
        
        // Extract databases
        dbSet.add(extractDatabase(source));
        dbSet.add(extractDatabase(dest));
      }
    });

    // Build flat structure to avoid circular references
    const tableInfo = new Map();
    
    relationships.forEach(rel => {
      // Collect destination info
      if (!tableInfo.has(rel.destination)) {
        tableInfo.set(rel.destination, {
          name: rel.destination,
          type: rel.destinationType,
          database: extractDatabase(rel.destination),
          sourceNames: [],
          notebooks: []
        });
      }
      const destInfo = tableInfo.get(rel.destination);
      if (!destInfo.sourceNames.includes(rel.source)) {
        destInfo.sourceNames.push(rel.source);
      }
      if (!destInfo.notebooks.includes(rel.notebook)) {
        destInfo.notebooks.push(rel.notebook);
      }
      
      // Collect source info
      if (!tableInfo.has(rel.source)) {
        tableInfo.set(rel.source, {
          name: rel.source,
          type: rel.sourceType,
          database: extractDatabase(rel.source),
          sourceNames: [],
          notebooks: []
        });
      }
    });

    // Find root tables (tables that are destinations)
    const roots = Array.from(tableInfo.values())
      .filter(table => {
        const isDest = relationships.some(rel => rel.destination === table.name);
        return isDest;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setDatabases(['all', ...Array.from(dbSet).sort()]);
    setLineageData({ tables: tableInfo, roots, relationships });
  };

  const toggleNode = (tableName) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedNodes(newExpanded);
  };

  const getTypeIcon = (type) => {
    if (type === 'PARQUET') return <Database className="w-4 h-4 text-purple-500" />;
    if (type === 'CSV') return <FileText className="w-4 h-4 text-green-500" />;
    return <Table className="w-4 h-4 text-blue-500" />;
  };

  const getTypeColor = (type) => {
    if (type === 'PARQUET') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (type === 'CSV') return 'bg-green-100 text-green-700 border-green-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  };

  const exportJSON = () => {
    if (!lineageData) return;
    
    const jsonData = {
      tables: Array.from(lineageData.tables.entries()).map(([name, data]) => ({
        name,
        type: data.type,
        database: data.database,
        sources: data.sourceNames,
        notebooks: data.notebooks
      })),
      relationships: lineageData.relationships
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lineage.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filterByDatabase = (table) => {
    if (selectedDatabase === 'all') return true;
    return table.database === selectedDatabase;
  };

  const renderNode = (tableName, level = 0, visited = new Set()) => {
    if (!lineageData || visited.has(tableName)) return null;
    
    const newVisited = new Set(visited);
    newVisited.add(tableName);
    
    const tableData = lineageData.tables.get(tableName);
    if (!tableData) return null;
    
    // Filter by database
    if (!filterByDatabase(tableData)) return null;
    
    const isExpanded = expandedNodes.has(tableName);
    const hasSources = tableData.sourceNames && tableData.sourceNames.length > 0;
    const matchesSearch = !searchTerm || 
      tableName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch && level === 0) return null;

    return (
      <div key={`${tableName}-${level}`} className="mb-2">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
            selectedTable === tableName
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
          onClick={() => {
            setSelectedTable(tableName);
            if (hasSources) toggleNode(tableName);
          }}
        >
          {hasSources && (
            <button className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!hasSources && <div className="w-4" />}
          
          {getTypeIcon(tableData.type)}
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-gray-900 truncate">
              {tableName}
            </div>
            <div className="flex items-center gap-2">
              {tableData.notebooks && tableData.notebooks.length > 0 && (
                <div className="text-xs text-gray-500 truncate">
                  {tableData.notebooks[0]}
                </div>
              )}
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded">
                {tableData.database}
              </span>
            </div>
          </div>
          
          <span className={`px-2 py-1 text-xs rounded border ${getTypeColor(tableData.type)}`}>
            {tableData.type}
          </span>
          
          {hasSources && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
              {tableData.sourceNames.length} sources
            </span>
          )}
        </div>
        
        {isExpanded && hasSources && (
          <div className="mt-2">
            {tableData.sourceNames.map(sourceName => 
              renderNode(sourceName, level + 1, newVisited)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFlowView = () => {
    if (!selectedTable || !lineageData) return null;
    
    const tableData = lineageData.tables.get(selectedTable);
    if (!tableData) return null;

    const renderFlowNode = (tableName, level = 0, visited = new Set()) => {
      if (visited.has(tableName) || level > 5) return null;
      
      const newVisited = new Set(visited);
      newVisited.add(tableName);
      
      const node = lineageData.tables.get(tableName);
      if (!node) return null;

      return (
        <div key={`flow-${tableName}-${level}`} className="flex flex-col items-center mb-4">
          <div className={`px-4 py-3 rounded-lg border-2 shadow-sm ${getTypeColor(node.type)} min-w-[200px]`}>
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon(node.type)}
              <span className="font-semibold text-sm">{tableName.split('(')[0].trim()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-75">{node.type}</div>
              <div className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded">
                {node.database}
              </div>
            </div>
          </div>
          
          {node.sourceNames && node.sourceNames.length > 0 && level < 5 && (
            <>
              <div className="w-0.5 h-8 bg-gray-300"></div>
              <div className="flex gap-8 items-start">
                {node.sourceNames.slice(0, 5).map(sourceName => (
                  <div key={`flow-child-${sourceName}`}>
                    {renderFlowNode(sourceName, level + 1, newVisited)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    };

    return (
      <div className="p-6 bg-gray-50 rounded-lg overflow-auto max-h-[600px]">
        <h3 className="text-lg font-bold mb-4 text-gray-800">Flow View: {selectedTable}</h3>
        <div className="flex justify-center">
          {renderFlowNode(selectedTable)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading lineage data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!lineageData) return null;

  const filteredRoots = lineageData.roots.filter(filterByDatabase);
  const parquetCount = Array.from(lineageData.tables.values()).filter(t => t.type === 'PARQUET' && filterByDatabase(t)).length;
  const csvCount = Array.from(lineageData.tables.values()).filter(t => t.type === 'CSV' && filterByDatabase(t)).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Lineage Viewer</h1>
            <p className="text-gray-600">Explore data flow and dependencies across tables</p>
          </div>
          <button
            onClick={exportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>

        {/* Database Filter */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <label className="font-semibold text-gray-700">Filter by Database:</label>
            <select
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {databases.map(db => (
                <option key={db} value={db}>
                  {db === 'all' ? 'All Databases' : db}
                </option>
              ))}
            </select>
            {selectedDatabase !== 'all' && (
              <span className="text-sm text-gray-600">
                ({filteredRoots.length} tables)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tree View */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-800 mb-3">Table Lineage</h2>
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="overflow-auto max-h-[600px]">
              {filteredRoots.length > 0 ? (
                filteredRoots.map(root => renderNode(root.name))
              ) : (
                <div className="text-center text-gray-400 py-8">
                  No tables found for selected database
                </div>
              )}
            </div>
          </div>

          {/* Flow View */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Dependency Flow</h2>
            {selectedTable ? (
              renderFlowView()
            ) : (
              <div className="flex items-center justify-center h-[600px] text-gray-400">
                Select a table to view its lineage flow
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{databases.length - 1}</div>
            <div className="text-sm text-gray-600">Databases</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{filteredRoots.length}</div>
            <div className="text-sm text-gray-600">Destination Tables</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{parquetCount}</div>
            <div className="text-sm text-gray-600">PARQUET Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{csvCount}</div>
            <div className="text-sm text-gray-600">CSV Files</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLineageViewer;
```

## 📝 14. README.md

```markdown
# Data Lineage Viewer 🚀

A beautiful and interactive data lineage visualization tool built with React, Vite, Tailwind CSS, and Docker.

## ✨ Features

- 📊 Interactive tree view of table dependencies
- 🔄 Visual flow diagram showing data lineage
- 🔍 Search functionality to find specific tables
- 🗄️ Filter by database
- 📤 Export lineage data to JSON
- 🎨 Color-coded by file type (PARQUET, CSV)
- 📱 Responsive design
- 🐳 Docker support for easy deployment

## 🚀 Quick Start

### ⚡ Setup Script Tự Động (Khuyên dùng)

Tạo file `setup.sh` và chạy để tự động setup toàn bộ:

```bash
#!/bin/bash

echo "🚀 Setting up Data Lineage Viewer..."

# Create project structure
mkdir -p data-lineage-viewer/{src/components,public,nginx}
cd data-lineage-viewer

# Create package.json
cat > package.json << 'EOF'
{
  "name": "data-lineage-viewer",
  "version": "1.0.0",
  "description": "Data Lineage Visualization Tool",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "vite": "^4.3.9"
  }
}
EOF

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Initialize Tailwind
echo "🎨 Initializing Tailwind CSS..."
npx tailwindcss init -p

echo "✅ Setup complete!"
echo "📝 Next steps:"
echo "1. Copy all source files to appropriate directories"
echo "2. Place your lineage.csv in public/ folder"
echo "3. Run: npm run dev"
```

Chạy setup:
```bash
chmod +x setup.sh
./setup.sh
```

### Method 1: Local Development

```bash
# 1. Clone or create the project
mkdir data-lineage-viewer
cd data-lineage-viewer

# 2. Initialize with Vite
npm create vite@latest . -- --template react

# 3. Install dependencies
npm install lucide-react papaparse
npm install -D tailwindcss postcss autoprefixer

# 4. Initialize Tailwind
npx tailwindcss init -p

# 5. Copy all source files from this guide
# ⚠️ QUAN TRỌNG: index.html phải ở thư mục ROOT, không phải public/

# 6. Place your lineage.csv in public/ folder

# 7. Run development server
npm run dev
```

Open http://localhost:5173

### Method 2: Docker (Recommended for Production)

```bash
# 1. Build the Docker image
docker build -t data-lineage-viewer .

# 2. Run the container
docker run -d -p 3000:80 --name lineage-viewer data-lineage-viewer

# Or use docker-compose
docker-compose up -d
```

Open http://localhost:3000

## 🐳 Docker Commands

```bash
# Build image
docker build -t data-lineage-viewer .

# Run container
docker run -d -p 3000:80 --name lineage-viewer data-lineage-viewer

# Stop container
docker stop lineage-viewer

# Remove container
docker rm lineage-viewer

# View logs
docker logs lineage-viewer

# Using docker-compose
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose logs -f        # View logs
docker-compose restart        # Restart
```

## 📋 CSV Format

Your `lineage.csv` should have the following columns:

```csv
notebook_name,source_table,source_type,destination_table,destination_type
./notebook.ipynb,source_table (db.db),PARQUET,dest_table (db.db),PARQUET
```

## 🏗️ Build for Production

```bash
# Local build
npm run build

# Docker build
docker build -t data-lineage-viewer:latest .
```

## 🌐 Deployment Options

### 1. Deploy to Cloud (Docker)

```bash
# Push to Docker Hub
docker tag data-lineage-viewer:latest yourusername/data-lineage-viewer:latest
docker push yourusername/data-lineage-viewer:latest

# Deploy on any cloud provider (AWS, GCP, Azure, etc.)
```

### 2. Deploy to Nginx Server

```bash
# Build the app
npm run build

# Copy dist folder to nginx
sudo cp -r dist/* /var/www/html/
```

### 3. Deploy to Vercel/Netlify

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or for Netlify
netlify deploy --prod
```

## 📁 Project Structure

```
data-lineage-viewer/
├── public/              # Static files
├── src/
│   ├── components/      # React components
│   ├── App.jsx         # Main app component
│   ├── index.js        # Entry point
│   └── index.css       # Global styles
├── nginx/              # Nginx configuration
├── Dockerfile          # Docker build file
├── docker-compose.yml  # Docker compose config
└── package.json        # Dependencies
```

## 🛠️ Technologies Used

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **CSV Parsing**: PapaParse
- **Server**: Nginx (in Docker)
- **Containerization**: Docker

## 🔧 Environment Variables

No environment variables required! Just place your `lineage.csv` in the `public/` folder.

## 📊 Features in Detail

### 1. Database Filter
- Filter tables by database
- Automatically extracts database names from table names
- Shows count of tables per database

### 2. Search
- Real-time search across all table names
- Highlights matching results

### 3. Tree View
- Expandable/collapsible tree structure
- Shows source dependencies
- Color-coded by file type

### 4. Flow Diagram
- Visual representation of data flow
- Shows up to 5 levels deep
- Prevents circular references

### 5. Export
- Export complete lineage as JSON
- Includes all relationships and metadata

## 🐛 Troubleshooting

### Issue: "Could not resolve entry module index.html"
```bash
# ⚠️ LỖI PHỔ BIẾN NHẤT!
# Nguyên nhân: index.html đặt sai vị trí

# ✅ ĐÚNG: index.html phải ở thư mục ROOT
data-lineage-viewer/
├── index.html          # ← ĐÂY
├── public/
│   └── lineage.csv
└── src/

# ❌ SAI: index.html KHÔNG được ở trong public/
data-lineage-viewer/
├── public/
│   ├── index.html      # ← SAI!
│   └── lineage.csv

# Fix:
mv public/index.html ./index.html
```

### Issue: CSV file not found
```bash
# Make sure lineage.csv is in public/ folder
ls public/lineage.csv

# If missing, copy your CSV file:
cp /path/to/your/lineage.csv public/
```

### Issue: Docker build fails
```bash
# Clean build
docker system prune -a
docker build --no-cache -t data-lineage-viewer .

# Check if all files exist
ls -la
# Should see: index.html, Dockerfile, package.json, src/, public/
```

### Issue: Port already in use
```bash
# Use different port
docker run -d -p 8080:80 data-lineage-viewer

# Or kill existing process
lsof -ti:3000 | xargs kill -9
```

### Issue: npm install fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Build works locally but fails in Docker
```bash
# Make sure .dockerignore exists and contains:
node_modules
npm-debug.log
dist
.git

# Rebuild without cache:
docker build --no-cache -t data-lineage-viewer .
```

## 📋 Verification Checklist trước khi build

Chạy các lệnh sau để kiểm tra cấu trúc:

```bash
# 1. Kiểm tra cấu trúc thư mục
tree -L 2 -I node_modules

# Kết quả mong đợi:
# .
# ├── index.html           ✓
# ├── package.json         ✓
# ├── vite.config.js       ✓
# ├── tailwind.config.js   ✓
# ├── postcss.config.js    ✓
# ├── Dockerfile           ✓
# ├── docker-compose.yml   ✓
# ├── public
# │   └── lineage.csv      ✓
# ├── src
# │   ├── App.jsx          ✓
# │   ├── index.js         ✓
# │   ├── index.css        ✓
# │   └── components
# │       └── DataLineageViewer.jsx  ✓
# └── nginx
#     └── nginx.conf       ✓

# 2. Verify index.html ở ROOT
test -f index.html && echo "✅ index.html OK" || echo "❌ index.html missing!"

# 3. Verify lineage.csv
test -f public/lineage.csv && echo "✅ lineage.csv OK" || echo "❌ lineage.csv missing!"

# 4. Test local build
npm run build
# Nếu thành công → dist/ folder được tạo

# 5. Test Docker build
docker build -t data-lineage-viewer . 
# Nếu thành công → No errors

# 6. Run and test
docker run -d -p 3000:80 --name test-lineage data-lineage-viewer
curl http://localhost:3000
# Nếu thành công → HTML response

# 7. Cleanup test
docker stop test-lineage && docker rm test-lineage
```

## 🎯 Quick Fix Script

Nếu gặp lỗi, chạy script này để fix:

```bash
#!/bin/bash
# save as fix-structure.sh

echo "🔧 Fixing project structure..."

# Ensure index.html is at root
if [ -f "public/index.html" ]; then
    echo "📦 Moving index.html to root..."
    mv public/index.html ./
fi

if [ ! -f "index.html" ]; then
    echo "❌ ERROR: index.html not found!"
    exit 1
fi

# Ensure lineage.csv is in public
if [ ! -f "public/lineage.csv" ]; then
    echo "⚠️  WARNING: lineage.csv not found in public/"
    echo "Please copy your CSV file to public/lineage.csv"
fi

# Create missing directories
mkdir -p src/components nginx

echo "✅ Structure fixed!"
echo "📋 Current structure:"
ls -la

echo ""
echo "🚀 Ready to build! Run:"
echo "   npm run dev    (for development)"
echo "   npm run build  (for production)"
echo "   docker build -t data-lineage-viewer .  (for Docker)"
```

Chạy fix:
```bash
chmod +x fix-structure.sh
./fix-structure.sh
```

MIT License

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please create an issue in the repository.

---

Made with ❤️