import React, { useState, useMemo } from 'react';
import ProductRow from './ProductRow';
import AddProductModal from './AddProductModal';

export default function ProductTable({ products, setProducts, onViewHistory }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const categories = useMemo(()=> Array.from(new Set(products.map(p=>p.category).filter(Boolean))), [products]);

  const filtered = products.filter(p=>{
    const matchesName = p.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = category ? p.category === category : true;
    return matchesName && matchesCat;
  });

  const onAddSuccess = (newProduct) => {
    // add to top of list
    setProducts(prev => [newProduct, ...prev]);
    setShowAdd(false);
  };

  return (
    <>
      <div style={{display:'flex', justifyContent:'space-between', margin:'12px 0'}}>
        <div style={{display:'flex', gap:8}}>
          <input placeholder="Search by name" value={query} onChange={e=>setQuery(e.target.value)} />
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <button className="btn" onClick={()=>setShowAdd(true)}>Add New Product</button>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th style={{width:40}}>ID</th>
            <th>Image</th>
            <th>Name</th>
            <th>Unit</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Stock</th>
            <th>Status</th>
            <th style={{width:200}}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(p=> <ProductRow key={p.id} product={p} setProducts={setProducts} onViewHistory={()=>onViewHistory(p)} />)}
          {filtered.length===0 && <tr><td colSpan="9" style={{textAlign:'center', padding:18}}>No products found</td></tr>}
        </tbody>
      </table>

      {showAdd && <AddProductModal onClose={()=>setShowAdd(false)} onAddSuccess={onAddSuccess} />}
    </>
  );
}
