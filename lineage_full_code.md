# Data Lineage Viewer - Full Source Code

## 📁 Cấu trúc thư mục

```
data-lineage-viewer/
├── public/
│   ├── index.html
│   └── lineage.csv
├── src/
│   ├── App.jsx
│   ├── components/
│   │   └── DataLineageViewer.jsx
│   ├── index.js
│   └── index.css
├── package.json
└── README.md
```

## 📦 1. package.json

```json
{
  "name": "data-lineage-viewer",
  "version": "1.0.0",
  "description": "Data Lineage Visualization Tool",
  "private": true,
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

## 🎨 2. tailwind.config.js

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

## ⚙️ 3. vite.config.js

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

## 🎯 4. postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## 📄 5. public/index.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Data Lineage Viewer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/index.js"></script>
  </body>
</html>
```

## 🎨 6. src/index.css

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
```

## 🚀 7. src/index.js

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

## 📱 8. src/App.jsx

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

## 🎯 9. src/components/DataLineageViewer.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Database, FileText, Table, Download } from 'lucide-react';
import Papa from 'papaparse';

const DataLineageViewer = () => {
  const [lineageData, setLineageData] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const processLineageData = (data) => {
    const relationships = [];
    
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

  const renderNode = (tableName, level = 0, visited = new Set()) => {
    if (!lineageData || visited.has(tableName)) return null;
    
    const newVisited = new Set(visited);
    newVisited.add(tableName);
    
    const tableData = lineageData.tables.get(tableName);
    if (!tableData) return null;
    
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
            {tableData.notebooks && tableData.notebooks.length > 0 && (
              <div className="text-xs text-gray-500 truncate">
                {tableData.notebooks[0]}
              </div>
            )}
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
            <div className="text-xs opacity-75">{node.type}</div>
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

  const parquetCount = Array.from(lineageData.tables.values()).filter(t => t.type === 'PARQUET').length;
  const csvCount = Array.from(lineageData.tables.values()).filter(t => t.type === 'CSV').length;

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
              {lineageData.roots.map(root => renderNode(root.name))}
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
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{lineageData.roots.length}</div>
            <div className="text-sm text-gray-600">Destination Tables</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{parquetCount}</div>
            <div className="text-sm text-gray-600">PARQUET Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{csvCount}</div>
            <div className="text-sm text-gray-600">CSV Files</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataLineageViewer;
```

## 📝 10. README.md

```markdown
# Data Lineage Viewer

A beautiful and interactive data lineage visualization tool built with React, Vite, and Tailwind CSS.

## Features

- 📊 Interactive tree view of table dependencies
- 🔄 Visual flow diagram showing data lineage
- 🔍 Search functionality to find specific tables
- 📤 Export lineage data to JSON
- 🎨 Color-coded by file type (PARQUET, CSV)
- 📱 Responsive design

## Installation

1. Install dependencies:
```bash
npm install
```

2. Place your `lineage.csv` file in the `public/` folder

3. Run the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## CSV Format

Your `lineage.csv` should have the following columns:
- `notebook_name`: Name of the notebook/script
- `source_table`: Source table name
- `source_type`: Type of source (PARQUET, CSV, etc.)
- `destination_table`: Destination table name
- `destination_type`: Type of destination

## Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

## Technologies Used

- React 18
- Vite
- Tailwind CSS
- Lucide React (icons)
- PapaParse (CSV parsing)
```

---

## 🚀 Hướng dẫn cài đặt chi tiết

### Bước 1: Khởi tạo project

```bash
# Tạo thư mục project
mkdir data-lineage-viewer
cd data-lineage-viewer

# Khởi tạo Vite project
npm create vite@latest . -- --template react

# Cài đặt dependencies
npm install
npm install lucide-react papaparse
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Bước 2: Copy các file

- Copy tất cả các file code ở trên vào đúng vị trí
- Đặt file `lineage.csv` của bạn vào thư mục `public/`

### Bước 3: Chạy project

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Bước 4: Truy cập

Mở trình duyệt và truy cập: `http://localhost:5173`

---

## 📋 Checklist

- [ ] Tạo các thư mục theo cấu trúc
- [ ] Copy tất cả các file code
- [ ] Đặt file lineage.csv vào public/
- [ ] Chạy npm install
- [ ] Chạy npm run dev
- [ ] Kiểm tra trên browser

## 🎯 Tính năng bổ sung có thể thêm

1. **Filter theo database**: Lọc các bảng theo database
2. **Export to PNG/SVG**: Export sơ đồ lineage thành hình ảnh
3. **Dark mode**: Thêm chế độ giao diện tối
4. **Zoom/Pan**: Zoom và kéo thả trên flow diagram
5. **Timeline view**: Xem lịch sử thay đổi lineage

Chúc bạn build thành công! Nếu có vấn đề gì, cứ hỏi nhé! 🚀
```

