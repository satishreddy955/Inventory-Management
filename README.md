#  Inventory Management System  
A complete full-stack **Product Inventory Management System** with:

- Product CRUD
- Image Upload (Multer)
- CSV Import / Export
- Search + Filtering
- Inline Editing
- Inventory History Tracking
- SQLite Database
- Fully deployed frontend + backend

---

## Features

###  Product Management
- Add, edit, delete products  
- Image upload from local machine  
- Stock status indicator (In Stock / Out of Stock)

###  CSV Import / Export
- Import products from CSV  
- Skip duplicates safely  
- Export inventory as CSV

###  Inventory Logs  
- Every stock change is logged  
- History panel shows:
  - Old quantity  
  - New quantity  
  - Timestamp  

###  Filters & Search
- Search by product name  
- Filter by category  

###  UI / UX
- Clean, simple React interface  
- Inline editing  
- Slide-in history sidebar  

---

##  Tech Stack

### Frontend
- React (Vite)
- Axios
- CSS 

### Backend
- Node.js
- Express.js
- SQLite3
- Multer (file uploads)
- CSV-Parser (CSV import)
- CORS

### Database
- SQLite local DB (`inventory.db`)


**Backend Setup**
- cd backend
- npm install
- npm start

**Frontend setup**
- cd frontend
- npm install
- npm run dev
