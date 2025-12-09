import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Database, FileText, Table, Download, Filter, ZoomIn, ZoomOut, Maximize2, Minimize2, ArrowDown, Info, RefreshCw, Package, ChevronLeft, List, HelpCircle, X } from 'lucide-react';
import Papa from 'papaparse';
import TableSchemaModal from './TableSchemaModal';

// Product configuration
const PRODUCTS = [
  { id: 'tinvay', name: 'Tinvay', lineageFile: 'lineage_tinvay.csv', schemaFile: 'schema_tinvay.csv', columnLineageFile: 'column_lineage_tinvay.csv' },
  { id: 'vc_card', name: 'VC Card', lineageFile: 'lineage_vc_card.csv', schemaFile: 'schema_vc_card.csv', columnLineageFile: 'column_lineage_vc_card.csv' },
  { id: 'fast_money', name: 'Fast Money', lineageFile: 'lineage_fast_money.csv', schemaFile: 'schema_fast_money.csv', columnLineageFile: 'column_lineage_fast_money.csv' },
];

// Transformation types legend/guide
const TRANSFORMATION_TYPES_INFO = {
  DIRECT: {
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: '→',
    label: 'Direct',
    description: 'Cột được copy trực tiếp từ source sang destination mà không thay đổi',
    example: "select('contract_id') → contract_id"
  },
  ALIAS: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: '↔',
    label: 'Alias',
    description: 'Cột được đổi tên (rename) từ source column sang tên mới',
    example: "col('old_name').alias('new_name')"
  },
  AGGREGATION: {
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: 'Σ',
    label: 'Aggregation',
    description: 'Cột được tính toán từ hàm tổng hợp (sum, count, avg, max, min...)',
    example: "sum('amount').alias('total')"
  },
  CONDITIONAL: {
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: '?',
    label: 'Conditional',
    description: 'Cột được tạo từ điều kiện when/case (if-else logic)',
    example: "when(col('dpd')>=30, 1).otherwise(0)"
  },
  EXPRESSION: {
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: 'ƒ',
    label: 'Expression',
    description: 'Cột được tính toán từ biểu thức phức tạp hoặc hàm',
    example: "col('a') + col('b'), concat(...)"
  },
  LITERAL: {
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: '#',
    label: 'Literal',
    description: 'Cột được gán giá trị cố định (constant), không từ source column',
    example: "lit(100), lit('active')"
  },
  CAST: {
    color: 'bg-indigo-100 text-indigo-700 border-indigo-300',
    icon: '⇄',
    label: 'Cast',
    description: 'Cột được chuyển đổi kiểu dữ liệu (type casting)',
    example: "col('id').cast('string')"
  },
  DATE_EXPR: {
    color: 'bg-pink-100 text-pink-700 border-pink-300',
    icon: '📅',
    label: 'Date Expression',
    description: 'Cột được tính toán từ các hàm xử lý ngày tháng',
    example: "date_format(), datediff(), date_add()"
  },
  STRING_EXPR: {
    color: 'bg-teal-100 text-teal-700 border-teal-300',
    icon: 'T',
    label: 'String Expression',
    description: 'Cột được xử lý từ các hàm chuỗi',
    example: "substring(), concat(), trim()"
  },
  WINDOW: {
    color: 'bg-cyan-100 text-cyan-700 border-cyan-300',
    icon: '▤',
    label: 'Window Function',
    description: 'Cột được tính từ window/analytical functions',
    example: "row_number(), rank(), lead(), lag()"
  },
  GROUPBY: {
    color: 'bg-amber-100 text-amber-700 border-amber-300',
    icon: '⊞',
    label: 'Group By',
    description: 'Cột được sử dụng làm key trong groupBy (pass-through)',
    example: "groupBy('utm_source', 'month')"
  },
  ARRAY_EXPR: {
    color: 'bg-rose-100 text-rose-700 border-rose-300',
    icon: '[]',
    label: 'Array Expression',
    description: 'Cột được tạo từ xử lý array/sequence',
    example: "explode(), sequence(), collect_list()"
  },
  UNKNOWN: {
    color: 'bg-slate-100 text-slate-600 border-slate-300',
    icon: '?',
    label: 'Unknown',
    description: 'Loại transformation chưa được phân loại',
    example: ''
  }
};

// Performance constants
const MAX_FLOW_SOURCES = 36; // Max sources to show in flow view
const MAX_TREE_DEPTH = 1; // Max depth in flow view
const SOURCES_PER_PAGE = 10; // Sources per page in list view
const MAX_TREE_LEVEL = 2; // Max levels to expand in tree view (left panel)

// Helper function to shorten notebook path
// Full: /home/jupyter/notebook.home/etl_data/dop/track_approval.ipynb
// Short: .../dop/track_approval.ipynb
const shortenPath = (fullPath) => {
  if (!fullPath) return '';
  
  // Remove leading ./ if present
  let path = fullPath.replace(/^\.\//, '');
  
  // Split by /
  const parts = path.split('/');
  
  // If path is short enough, return as is
  if (parts.length <= 2) return path;
  
  // Get last 2 parts (folder/filename)
  const shortParts = parts.slice(-2);
  return `.../${shortParts.join('/')}`;
};

const DataLineageViewer = () => {
  const [lineageData, setLineageData] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('all');
  const [databaseSearchTerm, setDatabaseSearchTerm] = useState('');
  const [showDatabaseDropdown, setShowDatabaseDropdown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Enhanced filter options
  const [filterMode, setFilterMode] = useState('destination'); // 'destination', 'source', 'both'
  const [searchScope, setSearchScope] = useState('all'); // 'all', 'destination', 'source'
  
  // Schema state
  const [schemaData, setSchemaData] = useState(new Map());
  const [selectedTableForSchema, setSelectedTableForSchema] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);

  // Column Lineage state
  const [columnLineageData, setColumnLineageData] = useState(new Map());

  // Product state
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // View mode state for handling large source lists
  const [flowViewMode, setFlowViewMode] = useState('flow'); // 'flow' or 'list'
  const [sourceListPage, setSourceListPage] = useState(0);

  // Transformation legend toggle
  const [showTransformLegend, setShowTransformLegend] = useState(false);

  // Load data when product changes
  useEffect(() => {
    loadData();
  }, [selectedProduct]);

  // Reset view mode when selecting new table
  useEffect(() => {
    setFlowViewMode('flow');
    setSourceListPage(0);
  }, [selectedTable]);

  // Auto-expand parent tables when searching in sources (with debounce)
  useEffect(() => {
    if (!searchTerm || !lineageData) {
      return;
    }
    
    // Debounce: wait 500ms after user stops typing
    const timeoutId = setTimeout(() => {
      // Only auto-expand if search term is at least 3 characters
      if (searchTerm.length < 3) return;
      
      const term = searchTerm.toLowerCase();
      const tablesToExpand = new Set();
      const MAX_AUTO_EXPAND = 10; // Limit to prevent performance issues
      
      // Find parent tables that have matching sources
      for (const root of lineageData.roots) {
        if (tablesToExpand.size >= MAX_AUTO_EXPAND) break;
        
        const tableData = lineageData.tables.get(root.name);
        if (!tableData || !tableData.sourceNames) continue;
        
        // Check if any source matches the search term
        const hasMatchingSource = tableData.sourceNames.some(src => 
          src.toLowerCase().includes(term)
        );
        
        // Expand if searching in 'all' or 'source' scope
        if (hasMatchingSource && (searchScope === 'all' || searchScope === 'source')) {
          tablesToExpand.add(root.name);
        }
      }
      
      // Expand matched parent tables
      if (tablesToExpand.size > 0) {
        setExpandedNodes(prev => {
          const newExpanded = new Set(prev);
          tablesToExpand.forEach(table => newExpanded.add(table));
          return newExpanded;
        });
      }
    }, 500); // 500ms debounce
    
    // Cleanup timeout on next keystroke
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchScope, lineageData]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setSelectedTable(null);
    setExpandedNodes(new Set());
    await loadCSVFile();
    await loadSchemaFile();
    await loadColumnLineageFile();
  };

  const loadCSVFile = async () => {
    try {
      const response = await fetch(`/${selectedProduct.lineageFile}`);
      if (!response.ok) {
        throw new Error(`File ${selectedProduct.lineageFile} not found`);
      }
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

  const loadSchemaFile = async () => {
    try {
      const response = await fetch(`/${selectedProduct.schemaFile}`);
      if (!response.ok) {
        console.warn(`Schema file ${selectedProduct.schemaFile} not found`);
        setSchemaData(new Map());
        return;
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processSchemaData(results.data);
        },
        error: (error) => {
          console.warn('Schema file error:', error);
          setSchemaData(new Map());
        }
      });
    } catch (err) {
      console.warn('Schema file not available');
      setSchemaData(new Map());
    }
  };

  const loadColumnLineageFile = async () => {
    try {
      const response = await fetch(`/${selectedProduct.columnLineageFile}`);
      if (!response.ok) {
        console.warn(`Column lineage file ${selectedProduct.columnLineageFile} not found`);
        setColumnLineageData(new Map());
        return;
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processColumnLineageData(results.data);
        },
        error: (error) => {
          console.warn('Column lineage file error:', error);
          setColumnLineageData(new Map());
        }
      });
    } catch (err) {
      console.warn('Column lineage file not available');
      setColumnLineageData(new Map());
    }
  };

  const processColumnLineageData = useCallback((data) => {
    // Group by destination_table
    const columnLineageMap = new Map();
    
    data.forEach(row => {
      const destTable = row.destination_table?.trim();
      if (!destTable) return;
      
      if (!columnLineageMap.has(destTable)) {
        columnLineageMap.set(destTable, []);
      }
      
      columnLineageMap.get(destTable).push({
        sourceTable: row.source_table?.trim() || '',
        sourceColumn: row.source_column?.trim() || '',
        destinationColumn: row.destination_column?.trim() || '',
        transformationType: row.transformation_type?.trim() || 'UNKNOWN',
        transformationExpr: row.transformation_expr?.trim() || '',
        notebook: row.notebook?.trim() || ''
      });
    });
    
    setColumnLineageData(columnLineageMap);
    console.log(`Loaded column lineage for ${columnLineageMap.size} tables from ${selectedProduct.columnLineageFile}`);
  }, [selectedProduct.columnLineageFile]);

  const processSchemaData = useCallback((data) => {
    const schemaMap = new Map();
    
    data.forEach(row => {
      const tableName = row.table_name?.trim();
      if (!tableName) return;
      
      if (!schemaMap.has(tableName)) {
        schemaMap.set(tableName, []);
      }
      
      schemaMap.get(tableName).push({
        column_name: row.column_name?.trim() || '',
        data_type: row.data_type?.trim() || '',
        is_nullable: row.is_nullable?.trim() || '',
        description: row.description?.trim() || '',
        sample_values: row.sample_values?.trim() || '',
        business_meaning: row.business_meaning?.trim() || ''
      });
    });
    
    setSchemaData(schemaMap);
    console.log(`Loaded schema for ${schemaMap.size} tables from ${selectedProduct.schemaFile}`);
  }, [selectedProduct.schemaFile]);

  const extractDatabase = useCallback((tableName) => {
    const match = tableName.match(/\((.+?)\.db\)/);
    return match ? match[1] : null;
  }, []);

  const processLineageData = useCallback((data) => {
    const relationships = [];
    const dbSet = new Set();
    
    // Group rows by notebook to find destination for each notebook
    const notebookDestinations = new Map();
    
    // First pass: find destination for each notebook
    data.forEach(row => {
      const notebook = row.notebook_name?.trim();
      const dest = row.destination_table?.trim();
      const destType = row.destination_type?.trim();
      
      if (notebook && dest) {
        if (!notebookDestinations.has(notebook)) {
          notebookDestinations.set(notebook, []);
        }
        const existingDests = notebookDestinations.get(notebook);
        if (!existingDests.find(d => d.dest === dest)) {
          existingDests.push({ dest, destType });
        }
      }
    });
    
    // Second pass: process all rows
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
        
        const sourceDb = extractDatabase(source);
        const destDb = extractDatabase(dest);
        if (sourceDb) dbSet.add(sourceDb);
        if (destDb) dbSet.add(destDb);
      }
      else if (source && !dest && notebook) {
        const notebookDests = notebookDestinations.get(notebook);
        if (notebookDests && notebookDests.length > 0) {
          notebookDests.forEach(({ dest: notebookDest, destType: notebookDestType }) => {
            if (source !== notebookDest) {
              relationships.push({
                notebook,
                source,
                sourceType,
                destination: notebookDest,
                destinationType: notebookDestType
              });
            }
          });
          
          const sourceDb = extractDatabase(source);
          if (sourceDb) dbSet.add(sourceDb);
        }
      }
    });

    const tableInfo = new Map();
    
    relationships.forEach(rel => {
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

    const roots = Array.from(tableInfo.values())
      .filter(table => {
        const isDest = relationships.some(rel => rel.destination === table.name);
        return isDest;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setDatabases(['all', ...Array.from(dbSet).sort()]);
    setLineageData({ tables: tableInfo, roots, relationships });
    
    console.log(`Processed ${relationships.length} relationships, ${roots.length} destination tables`);
  }, [extractDatabase]);

  const toggleNode = useCallback((tableName) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(tableName)) {
        newExpanded.delete(tableName);
      } else {
        newExpanded.add(tableName);
      }
      return newExpanded;
    });
  }, []);

  const getTypeIcon = useCallback((type) => {
    if (type === 'PARQUET') return <Database className="w-4 h-4 text-purple-500" />;
    if (type === 'CSV') return <FileText className="w-4 h-4 text-green-500" />;
    return <Table className="w-4 h-4 text-blue-500" />;
  }, []);

  const getTypeColor = useCallback((type) => {
    if (type === 'PARQUET') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (type === 'CSV') return 'bg-green-100 text-green-700 border-green-300';
    return 'bg-blue-100 text-blue-700 border-blue-300';
  }, []);

  const exportJSON = useCallback(() => {
    if (!lineageData) return;
    
    const jsonData = {
      product: selectedProduct.name,
      tables: Array.from(lineageData.tables.entries()).map(([name, data]) => ({
        name,
        type: data.type,
        database: data.database,
        sources: data.sourceNames,
        notebooks: data.notebooks,
        schema: schemaData.get(name) || []
      })),
      relationships: lineageData.relationships
    };
    
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lineage_${selectedProduct.id}_with_schema.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [lineageData, selectedProduct, schemaData]);

  const filterByDatabase = useCallback((table) => {
    if (selectedDatabase === 'all') return true;
    if (!table) return false;
    
    switch (filterMode) {
      case 'destination':
        // Only filter by destination table's database
        return table.database === selectedDatabase;
      
      case 'source':
        // Filter if any source belongs to selected database
        if (table.sourceNames && table.sourceNames.length > 0) {
          return table.sourceNames.some(sourceName => {
            const sourceTable = lineageData?.tables.get(sourceName);
            return sourceTable?.database === selectedDatabase;
          });
        }
        return false;
      
      case 'both':
        // Filter if destination OR any source belongs to selected database
        if (table.database === selectedDatabase) return true;
        if (table.sourceNames && table.sourceNames.length > 0) {
          return table.sourceNames.some(sourceName => {
            const sourceTable = lineageData?.tables.get(sourceName);
            return sourceTable?.database === selectedDatabase;
          });
        }
        return false;
      
      default:
        return table.database === selectedDatabase;
    }
  }, [selectedDatabase, filterMode, lineageData]);

  const getFilteredDatabases = useMemo(() => {
    if (!databaseSearchTerm) return databases;
    return databases.filter(db => 
      db.toLowerCase().includes(databaseSearchTerm.toLowerCase())
    );
  }, [databases, databaseSearchTerm]);

  const handleDatabaseSelect = useCallback((db) => {
    setSelectedDatabase(db);
    setDatabaseSearchTerm('');
    setShowDatabaseDropdown(false);
  }, []);

  const handleProductSelect = useCallback((product) => {
    setSelectedProduct(product);
    setShowProductDropdown(false);
    setSelectedDatabase('all');
  }, []);

  const handleSaveSchema = useCallback(async (tableName, updatedSchema) => {
    const newSchemaData = new Map(schemaData);
    newSchemaData.set(tableName, updatedSchema);
    setSchemaData(newSchemaData);
    
    const csvContent = generateCompleteSchemaCSV(newSchemaData);
    
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/save-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          csv: csvContent,
          filename: selectedProduct.schemaFile 
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSaveStatus('success');
        console.log(`✅ Schema saved successfully to ${selectedProduct.schemaFile}`);
        showNotification('success', `Schema đã được lưu vào ${selectedProduct.schemaFile}!`);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error(result.error || 'API save failed');
      }
    } catch (error) {
      console.warn('API not available, falling back to download:', error.message);
      setSaveStatus('error');
      
      downloadSchemaCSV(csvContent, selectedProduct.schemaFile);
      
      showNotification('warning', 
        'Backend API không khả dụng.\n' +
        `File ${selectedProduct.schemaFile} đã được download.\n\n` +
        'Hướng dẫn:\n' +
        `1. Copy file vào: public/${selectedProduct.schemaFile}\n` +
        '2. Reload trang (F5)'
      );
      
      setTimeout(() => setSaveStatus(null), 3000);
    }
    
    console.log('Schema updated for', tableName);
  }, [schemaData, selectedProduct.schemaFile]);

  const showNotification = (type, message) => {
    if (type === 'success') {
      alert('✅ ' + message);
    } else if (type === 'warning') {
      alert('⚠️ ' + message);
    } else {
      alert(message);
    }
  };

  const generateCompleteSchemaCSV = (schemaMap) => {
    const csvRows = [
      'table_name,column_name,data_type,is_nullable,description,sample_values,business_meaning'
    ];
    
    const sortedTables = Array.from(schemaMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    
    sortedTables.forEach(([tableName, columns]) => {
      columns.forEach(col => {
        if (!col.column_name || !col.column_name.trim()) return;
        
        const row = [
          tableName,
          col.column_name || '',
          col.data_type || '',
          col.is_nullable || 'NO',
          col.description || '',
          col.sample_values || '',
          col.business_meaning || ''
        ].map(field => {
          const escaped = String(field).replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
            ? `"${escaped}"` 
            : escaped;
        }).join(',');
        
        csvRows.push(row);
      });
    });
    
    return csvRows.join('\n');
  };

  const downloadSchemaCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateEmptySchema = useCallback((tableName) => {
    return [];
  }, []);

  const reloadSchema = useCallback(async () => {
    setSaveStatus('saving');
    await loadSchemaFile();
    setSaveStatus('success');
    showNotification('success', `Schema đã được reload từ ${selectedProduct.schemaFile}!`);
    setTimeout(() => setSaveStatus(null), 2000);
  }, [selectedProduct.schemaFile]);

  // Memoized filtered roots
  const filteredRoots = useMemo(() => {
    if (!lineageData) return [];
    
    // When filterMode is 'source', show source tables instead of destination tables
    if (filterMode === 'source' && selectedDatabase !== 'all') {
      // Collect all unique source tables that belong to selected database
      const sourceTables = new Set();
      
      lineageData.roots.forEach(root => {
        const tableData = lineageData.tables.get(root.name);
        if (tableData?.sourceNames) {
          tableData.sourceNames.forEach(sourceName => {
            const sourceTable = lineageData.tables.get(sourceName);
            if (sourceTable?.database === selectedDatabase) {
              sourceTables.add(sourceName);
            }
          });
        }
      });
      
      // Convert to array and return with consistent structure (same as roots)
      return Array.from(sourceTables).map(name => ({ name }));
    }
    
    return lineageData.roots.filter(filterByDatabase);
  }, [lineageData, filterByDatabase, filterMode, selectedDatabase]);

  // Memoized counts
  const { parquetCount, csvCount } = useMemo(() => {
    if (!lineageData) return { parquetCount: 0, csvCount: 0 };
    const tables = Array.from(lineageData.tables.values());
    return {
      parquetCount: tables.filter(t => t.type === 'PARQUET' && filterByDatabase(t)).length,
      csvCount: tables.filter(t => t.type === 'CSV' && filterByDatabase(t)).length
    };
  }, [lineageData, filterByDatabase]);

  const renderNode = useCallback((tableName, level = 0, visited = new Set()) => {
    if (!lineageData || visited.has(tableName)) return null;
    
    // Limit tree depth to MAX_TREE_LEVEL
    if (level > MAX_TREE_LEVEL) return null;
    
    const newVisited = new Set(visited);
    newVisited.add(tableName);
    
    const tableData = lineageData.tables.get(tableName);
    if (!tableData) return null;
    
    // Skip filterByDatabase check when filterMode is 'source' at level 0 (already filtered in filteredRoots)
    if (!(filterMode === 'source' && selectedDatabase !== 'all' && level === 0)) {
      if (!filterByDatabase(tableData)) return null;
    }
    
    const isExpanded = expandedNodes.has(tableName);
    const hasSources = tableData.sourceNames && tableData.sourceNames.length > 0;
    const hasSchema = schemaData.has(tableName);
    
    // Check if can expand (not at max level)
    const canExpand = hasSources && level < MAX_TREE_LEVEL;
    
    // Enhanced search - check based on searchScope
    const checkSearch = () => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      
      switch (searchScope) {
        case 'destination':
          return tableName.toLowerCase().includes(term);
        
        case 'source':
          // When filterMode is 'source', search in the source table names directly
          return tableName.toLowerCase().includes(term);
        
        case 'all':
        default:
          // Match destination name OR any source name
          if (tableName.toLowerCase().includes(term)) return true;
          if (tableData.sourceNames && tableData.sourceNames.length > 0) {
            return tableData.sourceNames.some(src => 
              src.toLowerCase().includes(term)
            );
          }
          return false;
      }
    };
    
    const matchesSearch = checkSearch();

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
            if (canExpand) toggleNode(tableName);
          }}
        >
          {canExpand && (
            <button className="flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          )}
          {!canExpand && <div className="w-4" />}
          
          {getTypeIcon(tableData.type)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm text-gray-900 truncate">
                {tableName}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTableForSchema(tableData);
                }}
                className={`p-1 rounded transition-colors ${
                  hasSchema 
                    ? 'hover:bg-blue-100' 
                    : 'hover:bg-yellow-100'
                }`}
                title={hasSchema ? "View schema" : "Add schema"}
              >
                <Info className={`w-3 h-3 ${hasSchema ? 'text-blue-500' : 'text-yellow-500'}`} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {tableData.notebooks && tableData.notebooks.length > 0 && (
                <div 
                  className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded cursor-help max-w-[200px] truncate"
                  title={tableData.notebooks[0]}
                >
                  📓 {shortenPath(tableData.notebooks[0])}
                </div>
              )}
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded flex-shrink-0">
                {tableData.database}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`px-2 py-1 text-xs rounded border ${getTypeColor(tableData.type)}`}>
              {tableData.type}
            </span>
          
            {hasSources && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                {tableData.sourceNames.length} sources
              </span>
            )}
          </div>
        </div>
        
        {isExpanded && canExpand && (
          <div className="mt-2">
            {tableData.sourceNames.map(sourceName => 
              renderNode(sourceName, level + 1, newVisited)
            )}
          </div>
        )}
      </div>
    );
  }, [lineageData, expandedNodes, schemaData, searchTerm, selectedTable, filterByDatabase, toggleNode, getTypeIcon, getTypeColor, filterMode, selectedDatabase, searchScope]);

  // Optimized Flow View with pagination for large source lists
  const renderFlowView = useCallback(() => {
    if (!selectedTable || !lineageData) return null;
    
    const tableData = lineageData.tables.get(selectedTable);
    if (!tableData) return null;

    const sourceCount = tableData.sourceNames?.length || 0;
    const hasManySources = sourceCount > MAX_FLOW_SOURCES;

    // List View for tables with many sources
    const renderListView = () => {
      const sources = tableData.sourceNames || [];
      const totalPages = Math.ceil(sources.length / SOURCES_PER_PAGE);
      const startIdx = sourceListPage * SOURCES_PER_PAGE;
      const endIdx = Math.min(startIdx + SOURCES_PER_PAGE, sources.length);
      const currentSources = sources.slice(startIdx, endIdx);

      return (
        <div className="p-4">
          {/* Header */}
          <div className={`px-4 py-3 rounded-lg border-2 shadow-sm ${getTypeColor(tableData.type)} mb-4`}>
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon(tableData.type)}
              <span className="font-semibold">{selectedTable.split('(')[0].trim()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="opacity-75">{tableData.type}</span>
              <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded">{tableData.database}</span>
            </div>
            <div className="text-sm mt-2 font-medium">{sourceCount} sources</div>
          </div>

          <ArrowDown className="w-6 h-6 text-gray-400 mx-auto mb-4" />

          {/* Source List */}
          <div className="space-y-2">
            {currentSources.map((sourceName, idx) => {
              const sourceNode = lineageData.tables.get(sourceName);
              const hasSchema = schemaData.has(sourceName);
              
              return (
                <div 
                  key={sourceName}
                  className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${getTypeColor(sourceNode?.type || 'TABLE')}`}
                  onClick={() => setSelectedTableForSchema(sourceNode || { name: sourceName })}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6">{startIdx + idx + 1}.</span>
                    {getTypeIcon(sourceNode?.type)}
                    <span className="font-medium text-sm flex-1 truncate">{sourceName.split('(')[0].trim()}</span>
                    <Info className={`w-4 h-4 ${hasSchema ? 'text-blue-500' : 'text-yellow-500'}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-8">
                    <span className="text-xs opacity-75">{sourceNode?.type || 'UNKNOWN'}</span>
                    <span className="text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded">
                      {sourceNode?.database || 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
              <button
                onClick={() => setSourceListPage(p => Math.max(0, p - 1))}
                disabled={sourceListPage === 0}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {sourceListPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setSourceListPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={sourceListPage >= totalPages - 1}
                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      );
    };

    // Optimized Flow Node - only render limited depth and sources
    const renderFlowNode = (tableName, level = 0, visited = new Set()) => {
      if (visited.has(tableName) || level > MAX_TREE_DEPTH) return null;
      
      const newVisited = new Set(visited);
      newVisited.add(tableName);
      
      const node = lineageData.tables.get(tableName);
      if (!node) return null;

      const nodeSources = node.sourceNames || [];
      const nodeSourceCount = nodeSources.length;
      const hasSources = nodeSourceCount > 0 && level < MAX_TREE_DEPTH;
      const hasSchema = schemaData.has(tableName);
      
      // Limit sources shown in flow view
      const displaySources = nodeSources.slice(0, MAX_FLOW_SOURCES);
      const hiddenCount = nodeSourceCount - displaySources.length;

      return (
        <div 
          key={`flow-${tableName}-${level}`} 
          className="flex flex-col items-center mb-4 relative"
        >
          <div 
            className={`px-4 py-3 rounded-lg border-2 shadow-sm ${getTypeColor(node.type)} min-w-[180px] max-w-[220px] relative z-10 bg-white cursor-pointer hover:shadow-lg transition-shadow`}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTableForSchema(node);
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              {getTypeIcon(node.type)}
              <span className="font-semibold text-sm truncate">{tableName.split('(')[0].trim()}</span>
              <Info className={`w-4 h-4 ml-auto flex-shrink-0 ${hasSchema ? 'text-blue-500' : 'text-yellow-500'}`} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-75">{node.type}</span>
              <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded truncate max-w-[80px]">
                {node.database}
              </span>
            </div>
            {nodeSourceCount > 0 && (
              <div className="text-xs mt-1 text-gray-600">
                {nodeSourceCount} source{nodeSourceCount > 1 ? 's' : ''}
              </div>
            )}
          </div>
          
          {hasSources && (
            <>
              <div className="my-2">
                <ArrowDown className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex flex-row flex-wrap gap-3 items-start justify-center">
                {displaySources.map((sourceName) => (
                  <div key={`flow-child-${sourceName}`} className="flex-shrink-0">
                    {renderFlowNode(sourceName, level + 1, newVisited)}
                  </div>
                ))}
                
                {/* Show indicator for hidden sources */}
                {hiddenCount > 0 && (
                  <div className="flex flex-col items-center">
                    <div className="px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-500 text-sm">
                      +{hiddenCount} more
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      );
    };

    return (
      <div className="relative w-full h-full">
        {/* Controls */}
        <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white rounded-lg shadow-lg p-2">
          {/* View Mode Toggle (only show if many sources) */}
          {hasManySources && (
            <>
              <button
                onClick={() => setFlowViewMode('flow')}
                className={`p-2 rounded transition-colors ${flowViewMode === 'flow' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                title="Flow View"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setFlowViewMode('list')}
                className={`p-2 rounded transition-colors ${flowViewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <div className="w-px bg-gray-300"></div>
            </>
          )}
          
          <button
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-3 py-2 hover:bg-gray-100 rounded transition-colors text-sm font-medium text-gray-700"
            title="Reset Zoom"
          >
            {Math.round(zoomLevel * 100)}%
          </button>
          <div className="w-px bg-gray-300"></div>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullScreen ? (
              <Minimize2 className="w-5 h-5 text-gray-700" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-700" />
            )}
          </button>
        </div>

        {/* Warning for large source count */}
        {hasManySources && flowViewMode === 'flow' && (
          <div className="absolute top-4 left-4 z-20 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
            ⚡ Showing max {MAX_FLOW_SOURCES} of {sourceCount} sources. 
            <button 
              onClick={() => setFlowViewMode('list')}
              className="ml-2 underline hover:text-yellow-900"
            >
              View all in list
            </button>
          </div>
        )}

        <div className="p-6 bg-gray-50 rounded-lg overflow-auto h-full">
          <h3 className="text-lg font-bold mb-6 text-gray-800">
            {flowViewMode === 'list' ? 'Source List' : 'Flow View'}: {selectedTable.split('(')[0].trim()}
          </h3>
          
          {flowViewMode === 'list' ? (
            renderListView()
          ) : (
            <div 
              className="flex justify-center items-start min-w-full"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {renderFlowNode(selectedTable)}
            </div>
          )}
        </div>
      </div>
    );
  }, [selectedTable, lineageData, schemaData, flowViewMode, sourceListPage, zoomLevel, isFullScreen, getTypeColor, getTypeIcon]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading {selectedProduct.name} lineage data...</div>
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
          <p className="mt-4 text-sm text-gray-500">
            Make sure file <code className="bg-gray-100 px-2 py-1 rounded">{selectedProduct.lineageFile}</code> exists in public folder
          </p>
        </div>
      </div>
    );
  }

  if (!lineageData) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Schema Modal */}
      {selectedTableForSchema && (
        <TableSchemaModal
          table={selectedTableForSchema}
          schema={schemaData.get(selectedTableForSchema.name) || generateEmptySchema(selectedTableForSchema.name)}
          columnLineage={columnLineageData.get(selectedTableForSchema.name) || []}
          onClose={() => setSelectedTableForSchema(null)}
          onSave={handleSaveSchema}
        />
      )}

      {/* Fullscreen overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-hidden">
              {renderFlowView()}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Lineage Viewer</h1>
            <p className="text-gray-600">Explore data flow and dependencies across tables</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Save status indicator */}
            {saveStatus && (
              <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${
                saveStatus === 'saving' ? 'bg-blue-100 text-blue-700' :
                saveStatus === 'success' ? 'bg-green-100 text-green-700' :
                'bg-red-100 text-red-700'
              }`}>
                {saveStatus === 'saving' && <RefreshCw className="w-4 h-4 animate-spin" />}
                {saveStatus === 'saving' ? 'Đang lưu...' :
                 saveStatus === 'success' ? '✓ Đã lưu' : '✗ Lỗi'}
              </span>
            )}

            {/* Product Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProductDropdown(!showProductDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Package className="w-4 h-4" />
                {selectedProduct.name}
                <ChevronDown className={`w-4 h-4 transition-transform ${showProductDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showProductDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowProductDropdown(false)}
                  />
                  <div className="absolute right-0 z-20 mt-2 w-48 bg-white border border-gray-300 rounded-lg shadow-lg overflow-hidden">
                    {PRODUCTS.map(product => (
                      <button
                        key={product.id}
                        onClick={() => handleProductSelect(product)}
                        className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors flex items-center justify-between ${
                          selectedProduct.id === product.id ? 'bg-indigo-100 text-indigo-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <span>{product.name}</span>
                        {selectedProduct.id === product.id && (
                          <span className="text-indigo-600">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={reloadSchema}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              title="Reload schema from file"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Schema
            </button>
            <button
              onClick={exportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
            
            {/* Transformation Guide Button */}
            <button
              onClick={() => setShowTransformLegend(true)}
              className="flex items-center justify-center w-10 h-10 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors shadow-md"
              title="Transformation Types Guide"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transformation Legend Modal */}
        {showTransformLegend && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-4xl max-h-[85vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Column Lineage - Transformation Types
                </h3>
                <button
                  onClick={() => setShowTransformLegend(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Modal Body */}
              <div className="p-6 overflow-auto max-h-[calc(85vh-120px)]">
                <p className="text-sm text-gray-600 mb-4">
                  Giải thích ý nghĩa các loại transformation trong Column Lineage. Mỗi loại mô tả cách dữ liệu được chuyển đổi từ source column sang destination column.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(TRANSFORMATION_TYPES_INFO).map(([type, info]) => (
                    <div 
                      key={type}
                      className={`p-3 rounded-lg border-2 ${info.color}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold">{info.icon}</span>
                        <span className="font-semibold">{info.label}</span>
                        <span className="text-xs px-2 py-0.5 bg-white/50 rounded font-mono">{type}</span>
                      </div>
                      <p className="text-sm mb-2">{info.description}</p>
                      {info.example && (
                        <code className="text-xs bg-white/50 px-2 py-1 rounded block truncate font-mono" title={info.example}>
                          {info.example}
                        </code>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Click vào bảng bất kỳ trong Table Lineage, sau đó mở tab "Column Lineage" trong Schema Modal để xem chi tiết transformation của từng cột.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center gap-3">
          <Package className="w-5 h-5 text-indigo-600" />
          <span className="text-sm text-indigo-800">
            <strong>Product:</strong> {selectedProduct.name} | 
            <span className="ml-2 text-indigo-600">Lineage: {selectedProduct.lineageFile}</span> | 
            <span className="ml-2 text-indigo-600">Schema: {selectedProduct.schemaFile}</span>
          </span>
        </div>

        {/* Database Filter */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col gap-3">
            {/* Row 1: Database filter */}
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-5 h-5 text-gray-600" />
              <label className="font-semibold text-gray-700">Filter by Database:</label>
              
              {/* Filter Mode Selector */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setFilterMode('destination')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    filterMode === 'destination' 
                      ? 'bg-white text-blue-700 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Filter tables where destination is in selected database"
                >
                  Destination
                </button>
                <button
                  onClick={() => setFilterMode('source')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    filterMode === 'source' 
                      ? 'bg-white text-blue-700 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Filter tables that have sources from selected database"
                >
                  Source
                </button>
                <button
                  onClick={() => setFilterMode('both')}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${
                    filterMode === 'both' 
                      ? 'bg-white text-blue-700 shadow-sm font-medium' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title="Filter tables where destination OR source is in selected database"
                >
                  Both
                </button>
              </div>
              
              {/* Database Dropdown */}
              <div className="relative flex-1 max-w-xs">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={selectedDatabase === 'all' ? 'All Databases' : selectedDatabase}
                    value={databaseSearchTerm}
                    onChange={(e) => {
                      setDatabaseSearchTerm(e.target.value);
                      setShowDatabaseDropdown(true);
                    }}
                    onFocus={() => setShowDatabaseDropdown(true)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => setShowDatabaseDropdown(!showDatabaseDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showDatabaseDropdown ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {showDatabaseDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowDatabaseDropdown(false)}
                    />
                    
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {getFilteredDatabases.length > 0 ? (
                        getFilteredDatabases.map(db => (
                          <button
                            key={db}
                            onClick={() => handleDatabaseSelect(db)}
                            className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition-colors flex items-center justify-between ${
                              selectedDatabase === db ? 'bg-blue-100 font-medium text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            <span>
                              {db === 'all' ? (
                                <span className="flex items-center gap-2">
                                  <Database className="w-4 h-4" />
                                  All Databases
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Database className="w-4 h-4 text-purple-500" />
                                  {db}
                                  <span className="text-xs text-gray-500">.db</span>
                                </span>
                              )}
                            </span>
                            {selectedDatabase === db && (
                              <span className="text-blue-600">✓</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-center text-gray-500 text-sm">
                          No databases found matching "{databaseSearchTerm}"
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {selectedDatabase !== 'all' && (
                <button
                  onClick={() => {
                    setSelectedDatabase('all');
                    setDatabaseSearchTerm('');
                  }}
                  className="px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Clear
                </button>
              )}

              {selectedDatabase !== 'all' && (
                <span className="text-sm text-gray-600 flex items-center gap-1">
                  <span className="font-medium">{filteredRoots.length}</span> tables
                </span>
              )}
              
              {schemaData.size > 0 && (
                <span className="ml-auto text-sm text-green-600 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  {schemaData.size} with schema
                </span>
              )}
            </div>
            
            {/* Filter mode description */}
            {selectedDatabase !== 'all' && (
              <div className="text-xs text-gray-500 ml-8">
                {filterMode === 'destination' && (
                  <span>📍 Showing tables where <strong>destination</strong> is in <strong>{selectedDatabase}.db</strong></span>
                )}
                {filterMode === 'source' && (
                  <span>📍 Showing <strong>source tables</strong> in <strong>{selectedDatabase}.db</strong></span>
                )}
                {filterMode === 'both' && (
                  <span>📍 Showing tables where <strong>destination OR sources</strong> are in <strong>{selectedDatabase}.db</strong></span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-800">Table Lineage</h2>
                
                {/* Search Scope Selector */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setSearchScope('all')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      searchScope === 'all' 
                        ? 'bg-white text-blue-700 shadow-sm font-medium' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Search in all table names"
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSearchScope('destination')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      searchScope === 'destination' 
                        ? 'bg-white text-blue-700 shadow-sm font-medium' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Search only in destination table names"
                  >
                    Dest
                  </button>
                  <button
                    onClick={() => setSearchScope('source')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      searchScope === 'source' 
                        ? 'bg-white text-blue-700 shadow-sm font-medium' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    title="Search only in source table names"
                  >
                    Source
                  </button>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    searchScope === 'all' ? "Search all tables..." :
                    searchScope === 'destination' ? "Search destination tables..." :
                    "Search in source tables..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {searchTerm && (
                <div className="text-xs text-gray-500 mt-2">
                  {searchScope === 'all' && <span>🔍 Searching in destination AND source table names</span>}
                  {searchScope === 'destination' && <span>🔍 Searching only in destination table names</span>}
                  {searchScope === 'source' && <span>🔍 Searching tables that have matching source names</span>}
                </div>
              )}
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

          <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: '680px' }}>
            <div className="p-6 pb-3">
              <h2 className="text-xl font-bold text-gray-800">Dependency Flow</h2>
            </div>
            {selectedTable ? (
              <div className="h-[calc(100%-60px)]">
                {renderFlowView()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[calc(100%-60px)] text-gray-400">
                Select a table to view its lineage flow
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{databases.length - 1}</div>
            <div className="text-sm text-gray-600">Databases</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{filteredRoots.length}</div>
            <div className="text-sm text-gray-600">
              {filterMode === 'source' && selectedDatabase !== 'all' ? 'Source Tables' : 'Destination Tables'}
            </div>
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