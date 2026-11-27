# ecommerce-model-project
# Full-Stack E-Commerce Web Application

A responsive multi-category e-commerce storefront and order management application built with **React.js** on the frontend and **Java, Spring Boot, and MySQL** on the backend.

**Live Demo:** [https://mini-ecommerce-app-six.vercel.app](https://mini-ecommerce-app-six.vercel.app)

---

## Key Features

- **180+ Curated Products across 12 Categories:** Browse Electronics, Smart Wearables, Audio & Speakers, Home & Living, Kitchen & Dining, Fashion & Apparel, Footwear, Accessories & Bags, Beauty & Grooming, Sports & Fitness, Books & Stationery, and Mobile & Tablets.
- **Instant Search & Category Filtering:** Filter dynamically by product name, brand, category, or SKU.
- **Product Detail View & Related Carousel:** Inspect specifications, ratings, and discounts with a horizontally scrollable related-products strip.
- **Shopping Bag & Checkout Flow:** Add/remove items, update quantities, select payment modes (COD, UPI, Card), and add delivery notes.
- **Address Book Management:** Save, view, and switch between multiple delivery addresses.
- **Order History & Hybrid Persistence:** Tracks placed orders with timestamps, itemized breakdowns, and delivery details using REST API integration alongside `localStorage` fallback continuity.

---

## Tech Stack

- **Frontend:** React.js, Vite, Vanilla CSS, Lucide Icons
- **Backend:** Java, Spring Boot, Spring Data JPA, REST APIs
- **Database:** MySQL
- **Deployment & Version Control:** Git, GitHub, Vercel

---

## Running Locally

```bash
# Clone the repository
git clone [https://github.com/thisan2004/mini-ecommerce-app.git](https://github.com/thisan2004/mini-ecommerce-app.git)

# Navigate to project directory
cd mini-ecommerce-app

# Install dependencies
npm install

# Start development server
npm run dev
