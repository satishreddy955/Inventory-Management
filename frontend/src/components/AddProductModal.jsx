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
    image: '' 
  });
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Upload file to backend
  const uploadImageFile = async (file) => {
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append('image', file);

    try {
      const resp = await axios.post(
        'https://inventory-management-1-p0zc.onrender.com/api/products/upload',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (resp?.data?.imageUrl) {
        setForm(f => ({ ...f, image: resp.data.imageUrl }));
        setFileInputKey(Date.now());
        return resp.data.imageUrl;
      } else {
        throw new Error('Upload succeeded but no imageUrl returned');
      }

    } catch (err) {
      console.error('Image upload failed', err);
      alert('Image upload failed: ' + (err.response?.data?.error || err.message));
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Name is required');
    if (Number(form.stock) < 0) return alert('Stock must be >= 0');

    setLoading(true);

    try {
      const resp = await API.post('/products', {
        name: form.name.trim(),
        unit: form.unit.trim(),
        category: form.category.trim(),
        brand: form.brand.trim(),
        stock: Number(form.stock),
        status: form.status,
        image: form.image || null
      });

      alert('Product added successfully!');
      if (onAddSuccess) onAddSuccess(resp.data);

    } catch (err) {
      console.error('Add product failed', err);
      alert('Add failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const overlayStyle = { position:'fixed', inset:0, background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999 };
  const modalStyle = { width:520, background:'#fff', padding:18, borderRadius:8, boxShadow:'0 12px 30px rgba(0,0,0,0.12)' };

  return (
    <div style={overlayStyle} onMouseDown={onClose}>
      <div style={modalStyle} onMouseDown={e => e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
          <h3 style={{margin:0}}>Add New Product</h3>
          <button className="btn secondary" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={submit} style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>

          <label style={{gridColumn:'1 / 3'}}>
            Name *
            <input type="text" value={form.name} onChange={e => setField('name', e.target.value)} />
          </label>

          <label>
            Unit
            <input type="text" value={form.unit} onChange={e => setField('unit', e.target.value)} />
          </label>

          <label>
            Category
            <input type="text" value={form.category} onChange={e => setField('category', e.target.value)} />
          </label>

          <label>
            Brand
            <input type="text" value={form.brand} onChange={e => setField('brand', e.target.value)} />
          </label>

          <label>
            Stock *
            <input type="number" min="0" value={form.stock} onChange={e => setField('stock', e.target.value)} />
          </label>

          <label>
            Status
            <select value={form.status} onChange={e => setField('status', e.target.value)}>
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>

          {/* Image URL */}
          <label style={{gridColumn:'1 / 3'}}>
            Image URL (optional)
            <input type="text" value={form.image} onChange={e => setField('image', e.target.value)} />
          </label>

          {/* File Upload */}
          <div style={{gridColumn:'1 / 3', display:'flex', gap:8, alignItems:'center'}}>

            <input
              key={fileInputKey}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await uploadImageFile(file);
              }}
            />

            <button type="button" className="btn" disabled={!form.image} onClick={() => window.open(form.image, '_blank')}>
              Open Image
            </button>

            {/* Preview */}
            {form.image && (
              <img
                src={form.image}
                alt="preview"
                style={{width:64, height:64, borderRadius:6, objectFit:'cover'}}
              />
            )}

          </div>

          <div style={{gridColumn:'1 / 3', display:'flex', justifyContent:'flex-end', gap:8}}>
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button className="btn" type="submit" disabled={loading || uploading}>
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
