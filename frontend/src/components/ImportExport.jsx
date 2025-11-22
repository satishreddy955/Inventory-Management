import React, { useRef, useState } from 'react';
import API from '../api';

export default function ImportExport({ onImportComplete }) {
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);

  const onExport = async () => {
    try {
      const resp = await API.get('/products/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'products.csv'; document.body.appendChild(a); a.click(); a.remove();
    } catch(err) {
      console.error(err);
      alert('Export failed. Check backend.');
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const form = new FormData(); form.append('csvFile', file);
    try {
      const resp = await API.post('/products/import', form, { headers: {'Content-Type': 'multipart/form-data'} });
      alert(`Import complete. Added: ${resp.data.addedCount}, Skipped: ${resp.data.skippedCount}`);
      if (typeof onImportComplete === 'function') onImportComplete();
    } catch(err) {
      console.error(err);
      alert('Import failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
      e.target.value = null;
    }
  };

  return (
    <div style={{display:'flex', gap:8}}>
      <button className="btn" onClick={()=>fileRef.current && fileRef.current.click()} disabled={loading}>{loading?'Importing...':'Import'}</button>
      <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={onFileChange} />
      <button className="btn secondary" onClick={onExport}>Export</button>
    </div>
  );
}
