import React, { useState } from 'react';
import API from '../api';

export default function ProductRow({ product, setProducts, onViewHistory }) {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState({...product});

  const status = product.stock === 0 ? 'Out of Stock' : 'In Stock';

  const save = async () => {
    try {
      const resp = await API.put(`/products/${product.id}`, local);
      setProducts(prev => prev.map(p => p.id === product.id ? resp.data : p));
      setEditing(false);
    } catch(err) {
      console.error(err);
      alert('Update failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const remove = async () => {
    if (!confirm('Delete product?')) return;
    try {
      await API.delete(`/products/${product.id}`);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch(err) { console.error(err); alert('Delete failed'); }
  };

  return (
    <tr>
      <td>{product.id}</td>
      <td>{product.image ? <img src={product.image} alt="" style={{width:40}} /> : <span style={{fontSize:12,color:'#777'}}>No Image</span>}</td>
      <td>{editing ? <input value={local.name} onChange={e=>setLocal({...local, name:e.target.value})} /> : product.name}</td>
      <td>{editing ? <input value={local.unit} onChange={e=>setLocal({...local, unit:e.target.value})} /> : product.unit}</td>
      <td>{editing ? <input value={local.category} onChange={e=>setLocal({...local, category:e.target.value})} /> : product.category}</td>
      <td>{editing ? <input value={local.brand} onChange={e=>setLocal({...local, brand:e.target.value})} /> : product.brand}</td>
      <td>{editing ? <input type="number" value={local.stock} onChange={e=>setLocal({...local, stock: Number(e.target.value)})} /> : product.stock}</td>
      <td><span className={`status ${product.stock===0?'out':'in'}`}>{status}</span></td>
      <td>
        {!editing ? (
          <div style={{display:'flex', gap:6}}>
            <button className="btn" onClick={()=>{ setEditing(true); setLocal({...product}); }}>Edit</button>
            <button className="btn secondary" onClick={remove}>Delete</button>
            <button className="btn" onClick={onViewHistory}>History</button>
          </div>
        ) : (
          <div style={{display:'flex', gap:6}}>
            <button className="btn" onClick={save}>Save</button>
            <button className="btn secondary" onClick={()=>setEditing(false)}>Cancel</button>
          </div>
        )}
      </td>
    </tr>
  );
}
