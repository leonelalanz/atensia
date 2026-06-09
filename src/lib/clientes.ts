import { supabase } from './supabase';

export async function crearCliente(idEmpresaAdmin: string, datos: any) {
  try {
    console.log('Creando cliente:', datos);

    // Usar función RPC apropiada según si hay userId
    const { data, error } = datos.userId
      ? await supabase
          .rpc('assign_user_to_client', {
            p_user_id: datos.userId,
            p_nombre: datos.nombre,
            p_contacto_nombre: datos.contactoNombre,
            p_contacto_email: datos.contactoEmail,
            p_color_primario: datos.colorPrimario || '#2563eb',
          })
      : await supabase
          .rpc('create_client_company', {
            p_nombre: datos.nombre,
            p_contacto_nombre: datos.contactoNombre,
            p_contacto_email: datos.contactoEmail,
            p_color_primario: datos.colorPrimario || '#2563eb',
            p_user_id: null,
          });

    if (error) {
      console.error('Error creando cliente:', error);
      throw error;
    }

    if (!data[0]?.success) {
      throw new Error(data[0]?.error_msg || 'Error desconocido');
    }

    console.log('Cliente creado exitosamente:', data[0].company_id);
    return true;
  } catch (error) {
    console.error('Error en crearCliente:', error);
    throw error;
  }
}

export async function obtenerClientes(idEmpresaAdmin: string) {
  try {
    console.log('Obteniendo clientes de:', idEmpresaAdmin);

    const { data, error } = await supabase
      .rpc('get_admin_clients', {
        p_admin_company_id: idEmpresaAdmin,
      });

    if (error) {
      console.error('Error obteniendo clientes:', error);
      throw error;
    }

    // Transform the flat data to match expected structure
    const result = data?.map((row: any) => ({
      id: row.id,
      client_company_id: row.client_company_id,
      client_contact_name: row.client_contact_name,
      client_contact_email: row.client_contact_email,
      status: row.status,
      client_company: {
        id: row.client_company_id,
        name: row.company_name,
        primary_color: row.company_color,
      },
    })) || [];

    console.log('Clientes obtenidos:', result);
    return result;
  } catch (error) {
    console.error('Error en obtenerClientes:', error);
    return [];
  }
}

export async function suspenderCliente(idCliente: string) {
  try {
    const { error } = await supabase
      .from('client_companies')
      .update({ status: 'suspended' })
      .eq('id', idCliente);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error suspendiendo:', error);
    throw error;
  }
}

export async function reactivarCliente(idCliente: string) {
  try {
    const { error } = await supabase
      .from('client_companies')
      .update({ status: 'active' })
      .eq('id', idCliente);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error reactivando:', error);
    throw error;
  }
}

export async function obtenerPlataformasDespliegue() {
  try {
    const { data, error } = await supabase
      .from('deployment_platforms')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en plataformas:', error);
    return [];
  }
}

export async function obtenerPlataformasTest() {
  try {
    const { data, error } = await supabase
      .from('test_platforms')
      .select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en plataformas test:', error);
    return [];
  }
}
