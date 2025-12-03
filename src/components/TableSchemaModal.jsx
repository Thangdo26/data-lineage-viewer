import React, { useState, useEffect } from 'react';
import { X, Database, Info, Copy, FileText, Edit2, Save, Check, Plus, Trash2, Download } from 'lucide-react';

const TableSchemaModal = ({ table, schema, onClose, onSave }) => {
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
          <code className="text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200">
            {column.column_name}
          </code>
          <button
            onClick={() => copyToClipboard(column.column_name, `col-${idx}`)}
            className="opacity-0 hover:opacity-100 transition-opacity"
            title="Copy column name"
          >
            {copiedField === `col-${idx}` ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">
          {column.data_type || 'N/A'}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
          column.is_nullable === 'NO' 
            ? 'bg-red-100 text-red-700 border border-red-200' 
            : 'bg-green-100 text-green-700 border border-green-200'
        }`}>
          {column.is_nullable === 'NO' ? 'Required' : 'Optional'}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700">
          {column.description || <span className="text-gray-400 italic">Chưa có mô tả</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600">
          {column.business_meaning || <span className="text-gray-400 italic">Chưa định nghĩa</span>}
        </span>
      </td>
      <td className="px-4 py-3">
        <code className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 block">
          {column.sample_values || <span className="text-gray-400 italic">N/A</span>}
        </code>
      </td>
    </tr>
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {table.name.split('(')[0].trim()}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">{table.database || 'Unknown DB'}</span>
                <span className="text-gray-300">•</span>
                <span className={`text-sm px-2 py-0.5 rounded ${
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
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
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
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {table.notebooks && table.notebooks.length > 0 && (
              <span>Notebooks: <code className="bg-gray-200 px-2 py-1 rounded text-xs">{table.notebooks.join(', ')}</code></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editMode && (
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
