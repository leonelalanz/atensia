import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface BrandContextType {
  primaryColor: string;
  logoUrl: string;
  companyName: string;
  selectedCompanyId?: string;
  setSelectedCompanyId?: (id: string) => void;
  setAtensiaLogoUrl?: (url: string) => void;
}

const BrandContext = createContext<BrandContextType>({
  primaryColor: '#2563eb',
  logoUrl: '',
  companyName: 'Atensia',
});

// Marca por defecto de Atensia para superadmin
const ATENSIA_BRAND = {
  name: 'Atensia',
  color: '#1e293b',
  logo: new URL('../assets/logos/favicon.png', import.meta.url).href,
};

export function BrandProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [atensiaLogo, setAtensiaLogo] = useState('');
  const [atensiaColor, setAtensiaColor] = useState('#1e293b');

  const isSuperAdmin = profile?.role === 'superadmin';
  const company = (profile as any)?.company;

  // Cargar logo y color de Atensia desde localStorage
  useEffect(() => {
    const savedLogo = localStorage.getItem('atensia_logo_url') || '';
    const savedColor = localStorage.getItem('atensia_primary_color') || '#1e293b';
    setAtensiaLogo(savedLogo);
    setAtensiaColor(savedColor);

    // Escuchar cambios en el logo y color de Atensia
    const handleLogoChange = () => {
      const updatedLogo = localStorage.getItem('atensia_logo_url') || '';
      setAtensiaLogo(updatedLogo);
    };

    const handleColorChange = () => {
      const updatedColor = localStorage.getItem('atensia_primary_color') || '#1e293b';
      setAtensiaColor(updatedColor);
    };

    window.addEventListener('atensiaLogoChanged', handleLogoChange);
    window.addEventListener('atensiaColorChanged', handleColorChange);
    return () => {
      window.removeEventListener('atensiaLogoChanged', handleLogoChange);
      window.removeEventListener('atensiaColorChanged', handleColorChange);
    };
  }, []);

  function setAtensiaLogoUrl(url: string) {
    localStorage.setItem('atensia_logo_url', url);
    setAtensiaLogo(url);
  }

  // Lógica de marca según el rol o estado de autenticación
  let primaryColor = '#2563eb';
  let logoUrl = '';
  let companyName = 'Atensia';

  const atensiaLogoUrl = atensiaLogo || ATENSIA_BRAND.logo;

  if (!profile || isSuperAdmin) {
    // Usuario no autenticado o superadmin: usar Atensia
    primaryColor = atensiaColor;
    logoUrl = atensiaLogoUrl;
    companyName = ATENSIA_BRAND.name;
  } else {
    // Admin/Agent autenticado: usar su empresa
    const brandCompany = company;
    primaryColor = brandCompany?.primary_color ?? '#2563eb';
    logoUrl = brandCompany?.logo_url ?? '';
    companyName = brandCompany?.name ?? 'Atensia';
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-color', primaryColor);
    const r = parseInt(primaryColor.slice(1, 3), 16);
    const g = parseInt(primaryColor.slice(3, 5), 16);
    const b = parseInt(primaryColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--brand-color-rgb', `${r},${g},${b}`);
  }, [primaryColor]);

  return (
    <BrandContext.Provider value={{ primaryColor, logoUrl, companyName, setAtensiaLogoUrl }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}
