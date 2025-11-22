import React, { useState } from 'react';
import API from '../api';
import axios from 'axios';

export default function AddProductModal({ onClose, onAddSuccess }) {
  const [form, setForm] = useState({
    name: '',
    unit: '',
    category: '',
    brand: '',
    stock: 0,
    status: 'active',
    image: '' // will be set to uploaded image URL or user-provided URL
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now()); // to reset file input

  const SAMPLE_PATH = 'sandbox:/mnt/data/b91e5689-bcb1-4eaf-b9c2-71066605a54b.png';

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Upload selected file to backend and set form.image to returned URL
  const uploadImageFile = async (file) => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file); // backend expects field 'image'
    try {
      const resp = await axios.post('https://inventory-management-1-p0zc.onrender.com/products/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // resp.data.imageUrl -> e.g. "http://localhost:4000/uploads/abcd1234.jpg"
      if (resp && resp.data && resp.data.imageUrl) {
        setForm(f => ({ ...f, image: resp.data.imageUrl }));
        // reset file input
        setFileInputKey(Date.now());
        return resp.data.imageUrl;
      } else {
        throw new Error('Upload succeeded but no imageUrl returned');
      }
    } catch (err) {
      console.error('Image upload failed', err);
      const msg = (err.response && err.response.data && err.response.data.error)
        ? err.response.data.error
        : err.message || 'Unknown error';
      alert('Image upload failed: ' + msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || String(form.name).trim() === '') return alert('Name is required');
    if (Number(form.stock) < 0) return alert('Stock must be >= 0');

    setLoading(true);
    try {
      // Submit product (backend expects image to be a URL/path string)
      const resp = await API.post('/products', {
        name: form.name.trim(),
        unit: form.unit.trim(),
        category: form.category.trim(),
        brand: form.brand.trim(),
        stock: Number(form.stock),
        status: form.status || null,
        image: form.image || null
      });
      alert('Product added');
      if (onAddSuccess) onAddSuccess(resp.data);
    } catch (err) {
      console.error('Add product failed', err);
      const msg = (err.response && err.response.data && err.response.data.error)
        ? err.response.data.error
        : err.message || 'Unknown error';
      alert('Add failed: ' + msg);
    } finally {
      setTimeout(()=>setLoading(false), 200);
    }
  };

  // helper: use sample uploaded file path (for testing when upload route not available)
  const useSampleFile = () => {
    setForm(f => ({ ...f, image: SAMPLE_PATH }));
    // You can add a small info for users
    alert('Sample image path inserted into Image URL field.');
  };

  // Inline modal styles (same as before)
  const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 };
  const modalStyle = { width:520, background:'#fff', padding:18, borderRadius:8, boxShadow:'0 12px 30px rgba(0,0,0,0.12)' };

  // Helper to derive preview src — if sandbox: scheme used your environment may transform it server-side.
  const previewSrc = (() => {
    if (!form.image) return null;
    // common cases:
    //  - absolute URL: http://... or https://...
    //  - relative server path: /uploads/...
    //  - sandbox local path: sandbox:/mnt/...
    // For browser, http(s) or relative path will work; sandbox: may be transformed by your environment.
    return form.image;
  })();

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={e=>e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{margin:0}}>Add New Product</h3>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={submit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          <label style={{gridColumn:'1 / 3'}}>
            Name *
            <input type="text" value={form.name} onChange={e=>setField('name', e.target.value)} style={{width:'100%'}} />
          </label>

          <label>
            Unit
            <input type="text" value={form.unit} onChange={e=>setField('unit', e.target.value)} />
          </label>

          <label>
            Category
            <input type="text" value={form.category} onChange={e=>setField('category', e.target.value)} />
          </label>

          <label>
            Brand
            <input type="text" value={form.brand} onChange={e=>setField('brand', e.target.value)} />
          </label>

          <label>
            Stock *
            <input type="number" min="0" value={form.stock} onChange={e=>setField('stock', e.target.value)} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={e=>setField('status', e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          {/* Image URL field (user can paste a URL) */}
          <label style={{gridColumn:'1 / 3'}}>
            Image URL (or leave blank and upload a file)
            <input type="text" value={form.image} onChange={e=>setField('image', e.target.value)} />
            <div style={{fontSize:12,color:'#444', marginTop:6}}>
              Tip: you can either upload a file below or paste an image URL. If your backend upload endpoint isn't available you can use the sample file.
            </div>
          </label>

          {/* File upload */}
          <div style={{gridColumn:'1 / 3', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                await uploadImageFile(file);
              }}
            />
            <button type="button" className="btn" onClick={() => {
              // helper: open current image url in new tab (if it looks like a usable URL)
              if (form.image) {
                try { window.open(form.image, '_blank'); } catch { alert('Cannot open that URL'); }
              } else {
                alert('Choose a file to upload or paste an image URL first.');
              }
            }} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Open Image'}
            </button>

            <button type="button" className="btn secondary" onClick={useSampleFile}>
              Use sample uploaded file
            </button>

            {/* Preview of uploaded image (if set and appears to be a URL/path) */}
            {previewSrc ? (
              <div style={{marginLeft:8}}>
                <div style={{fontSize:12,color:'#6b7280'}}>Preview:</div>
                <img
                  src={previewSrc}
                  alt="preview"
                  style={{width:64, height:64, objectFit:'cover', borderRadius:6}}
                  onError={(e)=>{ e.target.style.display='none'; }}
                />
              </div>
            ) : null}
          </div>

          <div style={{gridColumn:'1 / 3', display:'flex', justifyContent:'flex-end', gap:8, marginTop:6}}>
            <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="btn" type="submit" disabled={loading || uploading}>{loading ? 'Adding...' : 'Add'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
