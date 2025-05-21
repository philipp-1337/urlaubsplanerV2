import React from 'react';

const DayCell = ({ 
  day, 
  status, 
  isWeekend, 
  onClick, 
  view = 'monthly', // monthly or calendar
  isGlobal // Added prop for global status
}) => {
  let cellClass = ''; // Initialize cellClass
  let cellContent = '';
  
  
  if (isWeekend) {
    cellClass = view === 'calendar' 
      ? "relative p-2 bg-gray-medium rounded" // Ensure 'relative' is present
      : "relative p-2 text-center border min-w-[50px] bg-gray-medium"; // Ensure 'relative' is present
  } else {
    if (view === 'calendar') {
      cellClass = "relative p-2 rounded cursor-pointer border"; // Ensure 'relative' is present
      
      if (status === 'urlaub') {
        cellClass += " bg-bold-blue text-white hover:bg-pastel-blue hover:text-bold-blue";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-bold-mint text-white hover:bg-pastel-mint hover:text-bold-mint"; 
      } else if (status === 'fortbildung') {
        cellClass += " bg-bold-apricot text-white hover:bg-pastel-apricot hover:text-bold-apricot"; 
      } else if (status === 'interne teamtage') {
        cellClass += " bg-bold-lavender text-white hover:bg-pastel-lavender hover:text-bold-lavender"; 
      } else if (status === 'feiertag') {
        cellClass += " bg-gray-dark text-white hover:bg-gray-medium hover:text-gray-dark"; 
      } else {
        cellClass += " bg-white border border-gray-medium hover:bg-gray-medium hover:text-gray-dark";
      }
    } else {
      cellClass = "relative p-2 text-center border min-w-[50px] cursor-pointer hover:bg-gray-medium"; // Ensure 'relative' is present
      
      if (status === 'urlaub') {
        cellClass += " bg-bold-blue text-white hover:bg-pastel-blue hover:text-bold-blue";
        cellContent = "U";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-bold-mint text-white hover:bg-pastel-mint hover:text-bold-mint";
        cellContent = "D";
      } else if (status === 'fortbildung') {
        cellClass += " bg-bold-apricot text-white hover:bg-pastel-apricot hover:text-bold-apricot";
        cellContent = "F"; 
      } else if (status === 'interne teamtage') {
        cellClass += " bg-bold-lavender text-white hover:bg-pastel-lavender hover:text-bold-lavender";
        cellContent = "T"; 
      } else if (status === 'feiertag') {
        cellClass += " bg-gray-dark text-white hover:bg-gray-medium hover:text-gray-dark";
        cellContent = "X"; 
      }
    }
  }
  
  const handleClick = () => {
    if (!isWeekend && onClick) {
      onClick();
    }
  };
  
  return (
    <div className={cellClass} onClick={handleClick}>
      {view === 'calendar' ? day.tag : cellContent}
      {/* Marker for global status */}
      {isGlobal && (
        <span
          title="Globaler Status"
          className="absolute bottom-1 left-1 w-2 h-2 bg-gray-medium rounded-full"
        ></span>
      )}
    </div>
  );
};

export default DayCell;