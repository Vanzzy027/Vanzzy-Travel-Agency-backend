// components/Sidebar.tsx
import React from 'react';

const Sidebar: React.FC = () => {
  const menuItems = [
    { icon: '🏠', label: 'Dashboard', active: true },
    { icon: '👥', label: 'Customers' },
    { icon: '📧', label: 'Messages' },
    { icon: '📊', label: 'Analytics' },
    { icon: '🚗', label: 'Fleet Management' },
    { icon: '📋', label: 'Bookings' },
    { icon: '💰', label: 'Payments' },
    { icon: '⚙️', label: 'Settings' },
  ];

  return (
    <div className="w-64 bg-[#001524] min-h-screen p-6">
      {/* Search */}
      <div className="mb-8">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search..."
            className="w-full bg-[#027480] text-[#E9E6DD] placeholder-[#E9E6DD] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#F57251]"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <span className="text-[#E9E6DD]">🔍</span>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <ul className="space-y-2">
        {menuItems.map((item, index) => (
          <li key={index}>
            <a
              href="#"
              className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
                item.active 
                  ? 'bg-[#027480] text-[#E9E6DD]' 
                  : 'text-[#E9E6DD] hover:bg-[#445048]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </a>
          </li>
        ))}
      </ul>

      {/* User Profile Section */}
      <div className="absolute bottom-6 left-6 right-6">
        <div className="flex items-center space-x-3 p-3 bg-[#445048] rounded-lg">
          <div className="w-12 h-12 rounded-full bg-[#D6CC99] flex items-center justify-center">
            <span className="text-[#001524] font-bold text-lg">P</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[#E9E6DD] font-semibold truncate">Prem Shahi</p>
            <p className="text-[#C4AD9D] text-sm truncate">Fleet Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;



// // Sidebar.tsx
// import React from 'react';

// const Sidebar: React.FC = () => {
//   const menuItems = [
//     { icon: '🏠', label: 'Dashboard', active: true },
//     { icon: '👥', label: 'Customers' },
//     { icon: '📧', label: 'Messages' },
//     { icon: '📊', label: 'Analytics' },
//     { icon: '📁', label: 'File Manager' },
//     { icon: '🎫', label: 'Bookings' },
//     { icon: '💾', label: 'Saved Trips' },
//     { icon: '⚙️', label: 'Settings' },
//   ];

//   return (
//     <div className="w-64 bg-[#001524] min-h-screen p-6">
//       {/* Search */}
//       <div className="mb-8">
//         <div className="relative">
//           <input 
//             type="text" 
//             placeholder="Search..."
//             className="w-full bg-[#027480] text-[#E9E6DD] placeholder-[#E9E6DD] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#F57251]"
//           />
//           <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
//             <span className="text-[#E9E6DD]">🔍</span>
//           </div>
//         </div>
//       </div>

//       {/* Menu Items */}
//       <ul className="space-y-2">
//         {menuItems.map((item, index) => (
//           <li key={index}>
//             <a
//               href="#"
//               className={`flex items-center space-x-3 p-3 rounded-lg transition-colors duration-200 ${
//                 item.active 
//                   ? 'bg-[#027480] text-[#E9E6DD]' 
//                   : 'text-[#E9E6DD] hover:bg-[#445048]'
//               }`}
//             >
//               <span className="text-lg">{item.icon}</span>
//               <span className="font-medium">{item.label}</span>
//             </a>
//           </li>
//         ))}
//       </ul>

//       {/* User Profile Section */}
//       <div className="absolute bottom-6 left-6 right-6">
//         <div className="flex items-center space-x-3 p-3 bg-[#445048] rounded-lg">
//           <div className="w-12 h-12 rounded-full bg-[#D6CC99] flex items-center justify-center">
//             <span className="text-[#001524] font-bold text-lg">P</span>
//           </div>
//           <div className="flex-1 min-w-0">
//             <p className="text-[#E9E6DD] font-semibold truncate">Prem Shahi</p>
//             <p className="text-[#C4AD9D] text-sm truncate">Web Designer</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Sidebar;