import axios from 'axios';

const API = axios.create({
  baseURL: 'https://inventory-management-1-p0zc.onrender.com/api'  
});

export default API;
