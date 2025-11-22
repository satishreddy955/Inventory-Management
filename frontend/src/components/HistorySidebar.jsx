import React, { useEffect, useState } from 'react';
import API from '../api';

export default function HistorySidebar({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ fetchHistory(); }, [product]);

  async function fetchHistory(){
    setLoading(true);
    try {
      const resp = await API.get(`/products/${product.id}/history`);
      setHistory(resp.data);
    } catch(err) { console.error(err); alert('Failed to load history'); }
    finally { setLoading(false); }
  }

  return (
    <div className="sidebar">
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
        <div><strong>History</strong><div style={{fontSize:12,color:'#6b7280'}}>{product.name}</div></div>
        <div><button className="btn secondary" onClick={onClose}>Close</button></div>
      </div>
      {loading ? <div>Loading...</div> : (
        <>
          {history.length===0 ? <div>No history</div> : history.map(h=>(
            <div key={h.id} style={{padding:8, borderBottom:'1px solid #eee'}}>
              <div><strong>{h.old_stock}</strong> → <strong>{h.new_stock}</strong></div>
              <div style={{fontSize:12,color:'#6b7280'}}>{new Date(h.timestamp).toLocaleString()}</div>
              <div style={{fontSize:12,color:'#6b7280'}}>By {h.changed_by || 'system'}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
