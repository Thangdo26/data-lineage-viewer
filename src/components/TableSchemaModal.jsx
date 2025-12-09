import React, { useState, useEffect } from 'react';
import { X, Database, Info, Copy, FileText, Edit2, Save, Check, Plus, Trash2, Download, GitBranch, ArrowRight, Layers, Table } from 'lucide-react';

const TableSchemaModal = ({ table, schema, columnLineage = [], onClose, onSave }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' or 'lineage'
  
  // Initialize with default empty row if schema is empty
  const getInitialSchema = () => {
    if (!schema || schema.length === 0 || (schema.length === 1 && !schema[0]?.column_name)) {
      return [{
        column_name: '',
        data_type: '',
        is_nullable: 'NO',
        description: '',
        sample_values: '',
        business_meaning: ''
      }];
    }
    return schema;
  };

  const [editMode, setEditMode] = useState(false);
  const [editedSchema, setEditedSchema] = useState(getInitialSchema());
  const [copiedField, setCopiedField] = useState(null);
  
  // Column lineage filter
  const [lineageFilter, setLineageFilter] = useState('');
  const [lineageGroupBy, setLineageGroupBy] = useState('destination'); // 'destination' or 'source'

  // Auto-enable edit mode when schema is empty
  useEffect(() => {
    const isEmpty = !schema || schema.length === 0 || 
      (schema.length === 1 && !schema[0]?.column_name);
    if (isEmpty) {
      setEditMode(true);
    }
  }, [schema]);

  if (!table) return null;

  // Check if schema is empty (for display purposes)
  const isEmptySchema = editedSchema.length === 0 || 
    (editedSchema.length === 1 && !editedSchema[0]?.column_name?.trim());

  // Process column lineage data
  const processedLineage = React.useMemo(() => {
    if (!columnLineage || columnLineage.length === 0) return { byDestination: new Map(), bySource: new Map() };
    
    const byDestination = new Map();
    const bySource = new Map();
    
    columnLineage.forEach(item => {
      // Group by destination column
      const destCol = item.destinationColumn;
      if (!byDestination.has(destCol)) {
        byDestination.set(destCol, []);
      }
      byDestination.get(destCol).push(item);
      
      // Group by source table
      const srcTable = item.sourceTable;
      if (!bySource.has(srcTable)) {
        bySource.set(srcTable, []);
      }
      bySource.get(srcTable).push(item);
    });
    
    return { byDestination, bySource };
  }, [columnLineage]);

  // Filter lineage data
  const filteredLineage = React.useMemo(() => {
    if (!lineageFilter) return processedLineage;
    
    const filter = lineageFilter.toLowerCase();
    const filteredByDest = new Map();
    const filteredBySource = new Map();
    
    processedLineage.byDestination.forEach((items, destCol) => {
      if (destCol.toLowerCase().includes(filter) || 
          items.some(i => i.sourceColumn.toLowerCase().includes(filter) || 
                         i.sourceTable.toLowerCase().includes(filter))) {
        filteredByDest.set(destCol, items);
      }
    });
    
    processedLineage.bySource.forEach((items, srcTable) => {
      if (srcTable.toLowerCase().includes(filter) ||
          items.some(i => i.destinationColumn.toLowerCase().includes(filter) ||
                         i.sourceColumn.toLowerCase().includes(filter))) {
        filteredBySource.set(srcTable, items);
      }
    });
    
    return { byDestination: filteredByDest, bySource: filteredBySource };
  }, [processedLineage, lineageFilter]);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSave = () => {
    if (onSave) {
      // Filter out completely empty rows
      const validSchema = editedSchema.filter(col => col.column_name && col.column_name.trim());
      onSave(table.name, validSchema);
    }
    setEditMode(false);
  };

  const addNewColumn = () => {
    setEditedSchema([
      ...editedSchema,
      {
        column_name: '',
        data_type: '',
        is_nullable: 'NO',
        description: '',
        sample_values: '',
        business_meaning: ''
      }
    ]);
  };

  const removeColumn = (index) => {
    if (editedSchema.length === 1) {
      alert('Cần giữ ít nhất 1 dòng trong schema');
      return;
    }
    if (window.confirm('Bạn có chắc muốn xóa cột này?')) {
      const newSchema = editedSchema.filter((_, idx) => idx !== index);
      setEditedSchema(newSchema);
    }
  };

  const exportSchema = () => {
    const csv = [
      ['Column', 'Type', 'Nullable', 'Description', 'Business Meaning', 'Sample Values'],
      ...editedSchema.map(col => [
        col.column_name,
        col.data_type,
        col.is_nullable,
        col.description,
        col.business_meaning,
        col.sample_values
      ])
    ].map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name.split('(')[0].trim()}_schema.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateDDL = () => {
    const tableName = table.name.split('(')[0].trim();
    const validColumns = editedSchema.filter(col => col.column_name?.trim());
    
    if (validColumns.length === 0) {
      alert('Chưa có column nào được định nghĩa');
      return;
    }
    
    const ddl = `CREATE TABLE ${tableName} (\n` +
      validColumns.map(col => 
        `  ${col.column_name} ${col.data_type || 'VARCHAR(255)'}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`
      ).join(',\n') +
      '\n);';
    
    copyToClipboard(ddl, 'ddl');
  };

  const updateColumn = (index, field, value) => {
    const newSchema = [...editedSchema];
    newSchema[index] = { ...newSchema[index], [field]: value };
    setEditedSchema(newSchema);
  };

  // Get transformation type badge color
  const getTransformBadge = (type) => {
    const colors = {
      'DIRECT': 'bg-green-100 text-green-700 border-green-300',
      'ALIAS': 'bg-blue-100 text-blue-700 border-blue-300',
      'EXPRESSION': 'bg-purple-100 text-purple-700 border-purple-300',
      'AGGREGATION': 'bg-orange-100 text-orange-700 border-orange-300',
      'CONDITIONAL': 'bg-yellow-100 text-yellow-700 border-yellow-300',
      'JOIN': 'bg-cyan-100 text-cyan-700 border-cyan-300',
      'WITHCOLUMN': 'bg-indigo-100 text-indigo-700 border-indigo-300',
      'LITERAL': 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-600 border-gray-300';
  };

  // Render table row in edit mode
  const renderEditRow = (column, idx) => (
    <tr key={idx} className="hover:bg-blue-50 transition-colors border-b border-gray-100">
      <td className="px-3 py-2">
        <button
          onClick={() => removeColumn(idx)}
          className="p-1.5 hover:bg-red-100 rounded transition-colors"
          title="Xóa cột"
        >
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={column.column_name || ''}
          onChange={(e) => updateColumn(idx, 'column_name', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          placeholder="column_name"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={column.data_type || ''}
          onChange={(e) => updateColumn(idx, 'data_type', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="VARCHAR(50)"
        />
      </td>
      <td className="px-3 py-2 text-center">
        <select
          value={column.is_nullable || 'NO'}
          onChange={(e) => updateColumn(idx, 'is_nullable', e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="NO">NO</option>
          <option value="YES">YES</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={column.description || ''}
          onChange={(e) => updateColumn(idx, 'description', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Mô tả..."
        />
      </td>
      <td className="px-3 py-2">
        <textarea
          value={column.business_meaning || ''}
          onChange={(e) => updateColumn(idx, 'business_meaning', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Ý nghĩa nghiệp vụ..."
          rows="1"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={column.sample_values || ''}
          onChange={(e) => updateColumn(idx, 'sample_values', e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
          placeholder="val1, val2, val3"
        />
      </td>
    </tr>
  );

  // Render table row in view mode
  const renderViewRow = (column, idx) => (
    <tr key={idx} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="font-mono text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {column.column_name}
          </code>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {column.data_type || '-'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
          column.is_nullable === 'NO' 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {column.is_nullable || 'NO'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
        {column.description || <span className="text-gray-400 italic">-</span>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
        {column.business_meaning || <span className="text-gray-400 italic">-</span>}
      </td>
      <td className="px-4 py-3">
        {column.sample_values ? (
          <code className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded block truncate max-w-xs">
            {column.sample_values}
          </code>
        ) : (
          <span className="text-gray-400 italic text-sm">-</span>
        )}
      </td>
    </tr>
  );

  // Render Column Lineage View
  const renderColumnLineageView = () => {
    const dataToShow = lineageGroupBy === 'destination' 
      ? filteredLineage.byDestination 
      : filteredLineage.bySource;
    
    if (dataToShow.size === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Chưa có Column Lineage</p>
          <p className="text-sm mt-2">
            {lineageFilter 
              ? 'Không tìm thấy kết quả phù hợp với bộ lọc' 
              : 'Chạy script extract_column_lineage.py để tạo dữ liệu'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {lineageGroupBy === 'destination' ? (
          // Group by destination column
          Array.from(dataToShow.entries()).map(([destCol, items]) => (
            <div key={destCol} className="border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b flex items-center gap-3">
                <Layers className="w-5 h-5 text-blue-600" />
                <code className="font-mono font-semibold text-blue-700">{destCol}</code>
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                  {items.length} source{items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y">
                {items.map((item, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-gray-50 flex items-start gap-3">
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600">{item.sourceTable}</span>
                        <span className="text-gray-400">.</span>
                        <code className="font-mono text-sm font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                          {item.sourceColumn}
                        </code>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getTransformBadge(item.transformationType)}`}>
                          {item.transformationType}
                        </span>
                      </div>
                      {item.transformationExpr && (
                        <div className="mt-2 text-xs bg-gray-100 p-2 rounded font-mono text-gray-600 overflow-x-auto">
                          📝 {item.transformationExpr}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          // Group by source table
          Array.from(dataToShow.entries()).map(([srcTable, items]) => (
            <div key={srcTable} className="border rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 border-b flex items-center gap-3">
                <Database className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-700">{srcTable}</span>
                <span className="text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                  {items.length} column{items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="divide-y">
                {items.map((item, idx) => (
                  <div key={idx} className="px-4 py-3 hover:bg-gray-50 flex items-center gap-3">
                    <code className="font-mono text-sm text-purple-600 bg-purple-50 px-2 py-0.5 rounded min-w-[120px]">
                      {item.sourceColumn}
                    </code>
                    <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <code className="font-mono text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {item.destinationColumn}
                    </code>
                    <span className={`text-xs px-2 py-0.5 rounded border ${getTransformBadge(item.transformationType)}`}>
                      {item.transformationType}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-2xl">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{table.name}</h2>
              <div className="flex items-center gap-2 text-sm mt-1">
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  table.type === 'PARQUET' 
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {table.type || 'TABLE'}
                </span>
                {table.sourceNames && table.sourceNames.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-gray-500">
                      {table.sourceNames.length} source(s)
                    </span>
                  </>
                )}
                {columnLineage.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm text-green-600">
                      {columnLineage.length} column mappings
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'schema' && (
              <>
                <button
                  onClick={generateDDL}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Copy DDL to clipboard"
                >
                  {copiedField === 'ddl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  DDL
                </button>
                <button
                  onClick={exportSchema}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV
                </button>
                {editMode && (
                  <button
                    onClick={addNewColumn}
                    className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Row
                  </button>
                )}
                <button
                  onClick={() => {
                    if (editMode) {
                      handleSave();
                    } else {
                      setEditMode(true);
                    }
                  }}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    editMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {editMode ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  {editMode ? 'Save Changes' : 'Edit'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b bg-gray-50 px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'schema'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Table className="w-4 h-4" />
              Schema
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                {editedSchema.filter(c => c.column_name?.trim()).length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('lineage')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'lineage'
                  ? 'border-blue-500 text-blue-600 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Column Lineage
              {columnLineage.length > 0 && (
                <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">
                  {columnLineage.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'schema' ? (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">
                    {editedSchema.filter(c => c.column_name?.trim()).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Total Columns</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">
                    {editedSchema.filter(c => c.is_nullable === 'NO' && c.column_name?.trim()).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Required Fields</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {new Set(editedSchema.map(c => c.data_type).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Data Types</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {editedSchema.filter(c => c.description && c.description.trim()).length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Documented</div>
                </div>
              </div>

              {/* Info box for new tables */}
              {isEmptySchema && editMode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                  <Info className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Bảng này chưa có schema</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Điền thông tin các cột bên dưới và nhấn "Save Changes" để lưu schema.
                      File schema.csv sẽ được download để bạn copy vào thư mục <code className="bg-yellow-100 px-1 rounded">public/</code>
                    </p>
                  </div>
                </div>
              )}

              {/* Schema Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                        {editMode && (
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 w-16">
                            Actions
                          </th>
                        )}
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Column Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Data Type
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Nullable
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Business Meaning
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2">
                          Sample Values
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editedSchema.map((column, idx) => 
                        editMode ? renderEditRow(column, idx) : renderViewRow(column, idx)
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add row button at bottom in edit mode */}
              {editMode && (
                <div className="flex justify-center">
                  <button
                    onClick={addNewColumn}
                    className="px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Thêm cột mới
                  </button>
                </div>
              )}
            </div>
          ) : (
            // Column Lineage Tab Content
            <div className="space-y-4">
              {/* Lineage Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">
                    {processedLineage.byDestination.size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Destination Columns</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="text-3xl font-bold text-purple-600">
                    {processedLineage.bySource.size}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Source Tables</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="text-3xl font-bold text-green-600">
                    {columnLineage.filter(c => c.transformationType === 'DIRECT').length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Direct Mappings</div>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
                  <div className="text-3xl font-bold text-orange-600">
                    {columnLineage.filter(c => c.transformationType !== 'DIRECT').length}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Transformations</div>
                </div>
              </div>

              {/* Filter and Group Controls */}
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search columns..."
                    value={lineageFilter}
                    onChange={(e) => setLineageFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 border">
                  <button
                    onClick={() => setLineageGroupBy('destination')}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      lineageGroupBy === 'destination'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    By Dest Column
                  </button>
                  <button
                    onClick={() => setLineageGroupBy('source')}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      lineageGroupBy === 'source'
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    By Source Table
                  </button>
                </div>
              </div>

              {/* Column Lineage List */}
              {renderColumnLineageView()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {table.notebooks && table.notebooks.length > 0 && (
              <span>Notebooks: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{table.notebooks.join(', ')}</code></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'schema' && editMode && (
              <span className="text-xs text-gray-500 mr-2">
                💡 Save sẽ download file schema.csv
              </span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableSchemaModal;