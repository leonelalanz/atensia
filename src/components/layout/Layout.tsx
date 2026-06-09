import React, { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div className={`fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto lg:translate-x-0 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
