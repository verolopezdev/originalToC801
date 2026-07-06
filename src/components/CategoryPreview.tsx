import React from 'react';

// Styles
import '../Main.css';
import './CategoryPreview.css';


interface CategoryPreviewProps {
  categoryIcon: string;
  categoryColor: string;
}


const CategoryPreview: React.FC<CategoryPreviewProps> = ({ categoryColor, categoryIcon }) => {
  
  const icon = categoryIcon || "fa-question-circle"; // Dynamically get icon
  return (
    <div className="category-preview" style={{backgroundColor: `var(--${categoryColor})`}}>
      <i className={`fas ${icon} category-preview-font`}></i>
    </div>
  );
}

export default CategoryPreview;