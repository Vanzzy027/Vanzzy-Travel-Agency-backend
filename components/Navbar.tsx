// components/Navbar.tsx
import React from 'react';

const Navbar: React.FC = () => {
  return (
    <div className="p-4 bg-[#E9E6DD]">
      <nav className="max-w-7xl mx-auto bg-[#001524] rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-[#027480] flex items-center justify-center">
              <span className="text-[#E9E6DD] font-bold text-lg">V</span>
            </div>
            <span className="text-[#E9E6DD] text-xl font-bold">VansKE Car Rental</span>
          </div>

          {/* Navigation Links - Updated for Car Rental */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Home</a>
            <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Fleet</a>
            <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Rates</a>
            <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Locations</a>
            <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Contact</a>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <button className="bg-[#027480] text-[#E9E6DD] px-6 py-2 rounded-full hover:bg-[#F57251] transition-colors duration-200">
              Rent Now
            </button>
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full bg-[#D6CC99] flex items-center justify-center">
                  <span className="text-[#001524] font-semibold">U</span>
                </div>
              </div>
              <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-[#001524] rounded-box w-52">
                <li><a className="text-[#E9E6DD] hover:text-[#F57251]">Profile</a></li>
                <li><a className="text-[#E9E6DD] hover:text-[#F57251]">My Bookings</a></li>
                <li><a className="text-[#E9E6DD] hover:text-[#F57251]">Logout</a></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;



// // Navbar.tsx
// import React from 'react';

// const Navbar: React.FC = () => {
//   return (
//     <div className="p-4 bg-[#E9E6DD]">
//       <nav className="max-w-7xl mx-auto bg-[#001524] rounded-2xl p-4 shadow-lg">
//         <div className="flex items-center justify-between">
//           {/* Logo/Brand */}
//           <div className="flex items-center space-x-2">
//             <div className="w-10 h-10 rounded-full bg-[#027480] flex items-center justify-center">
//               <span className="text-[#E9E6DD] font-bold text-lg">V</span>
//             </div>
//             <span className="text-[#E9E6DD] text-xl font-bold">VansKE Travel</span>
//           </div>

//           {/* Navigation Links */}
//           <div className="hidden md:flex items-center space-x-8">
//             <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Home</a>
//             <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Destinations</a>
//             <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Packages</a>
//             <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">About</a>
//             <a href="#" className="text-[#E9E6DD] hover:text-[#F57251] transition-colors duration-200">Contact</a>
//           </div>

//           {/* User Actions */}
//           <div className="flex items-center space-x-4">
//             <button className="bg-[#027480] text-[#E9E6DD] px-6 py-2 rounded-full hover:bg-[#F57251] transition-colors duration-200">
//               Book Now
//             </button>
//             <div className="dropdown dropdown-end">
//               <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
//                 <div className="w-10 rounded-full bg-[#D6CC99] flex items-center justify-center">
//                   <span className="text-[#001524] font-semibold">U</span>
//                 </div>
//               </div>
//               <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-[#001524] rounded-box w-52">
//                 <li><a className="text-[#E9E6DD] hover:text-[#F57251]">Profile</a></li>
//                 <li><a className="text-[#E9E6DD] hover:text-[#F57251]">Settings</a></li>
//                 <li><a className="text-[#E9E6DD] hover:text-[#F57251]">Logout</a></li>
//               </ul>
//             </div>
//           </div>
//         </div>
//       </nav>
//     </div>
//   );
// };

// export default Navbar;