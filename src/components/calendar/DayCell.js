import React from 'react';

const DayCell = ({ 
  day, 
  status, 
  isWeekend, 
  onClick, 
  view = 'monthly' // monthly or calendar
}) => {
  let cellClass = '';
  let cellContent = '';
  
  if (isWeekend) {
    cellClass = view === 'calendar' 
      ? "p-2 bg-gray-300 rounded" 
      : "p-2 text-center border min-w-[50px] bg-gray-200";
  } else {
    if (view === 'calendar') {
      cellClass = "p-2 rounded cursor-pointer";
      
      if (status === 'urlaub') {
        cellClass += " bg-blue-500 text-white";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-green-500 text-white"; // Verwendung der benutzerdefinierten Farbe
      } else if (status === 'fortbildung') {
        cellClass += " bg-yellow-500 text-white"; // Gelb für Fortbildung
      } else if (status === 'interne teamtage') {
        cellClass += " bg-purple-500 text-white"; // Lila für Interne Teamtage
      } else if (status === 'feiertag') {
        cellClass += " bg-orange-500 text-white"; // Orange für Feiertag
      } else {
        cellClass += " bg-white border border-gray-300 hover:bg-gray-100";
      }
    } else {
      cellClass = "p-2 text-center border min-w-[50px] cursor-pointer hover:bg-black-50";
      
      if (status === 'urlaub') {
        cellClass += " bg-blue-500 text-white hover:bg-blue-600";
        cellContent = "U";
      } else if (status === 'durchfuehrung') {
        cellClass += " bg-green-500 text-white hover:bg-green-600";
        cellContent = "D";
      } else if (status === 'fortbildung') {
        cellClass += " bg-yellow-500 text-white hover:bg-yellow-600";
        cellContent = "F"; // F für Fortbildung
      } else if (status === 'interne teamtage') {
        cellClass += " bg-purple-500 text-white hover:bg-purple-600";
        cellContent = "T"; // T für Teamtag
      } else if (status === 'feiertag') {
        cellClass += " bg-orange-500 text-white hover:bg-orange-600";
        cellContent = "X"; // X für Feiertag (oder FT)
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
    </div>
  );
};

export default DayCell;