import React, { useEffect, useState } from 'react';
import API from './api';
import ProductTable from './components/ProductTable';
import ImportExport from './components/ImportExport';
import HistorySidebar from './components/HistorySidebar';

export default function App() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(()=> { fetchProducts(); }, [refreshKey]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const resp = await API.get('/products');
      if (Array.isArray(resp.data)) setProducts(resp.data);
      else setProducts([]);
    } catch(err) {
      console.error(err);
      alert('Failed to fetch products. Check backend.');
    } finally { setLoading(false); }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h2>Inventory Management</h2>
          <div style={{fontSize:12, color:'#6b7280'}}>Search, import/export, inline edit, history</div>
        </div>
        <div className="controls">
          <ImportExport onImportComplete={()=>setRefreshKey(k=>k+1)} />
          <button className="btn secondary" onClick={()=>setRefreshKey(k=>k+1)} disabled={loading}>{loading?'Loading...':'Refresh'}</button>
        </div>
      </div>

      <ProductTable products={products} setProducts={setProducts} onViewHistory={(p)=>setSelected(p)} />

      {selected && <HistorySidebar product={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}
