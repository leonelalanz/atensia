import { supabase } from './supabase';

export async function crearDespliegue(datos: any) {
  try {
    console.log('Creando despliegue:', datos);

    const { data, error } = await supabase
      .rpc('insert_deployment_unified', {
        p_client_company_id: datos.idClienteEmpresa,
        p_platform_id: datos.idPlataforma || null,
        p_deployment_type: datos.tipo || 'production',
        p_version: datos.version,
        p_build_number: datos.numeroCompilacion,
        p_uploaded_by: datos.idUsuario,
        p_release_notes: datos.notasLanzamiento || '',
        p_test_url: datos.urlTest || '',
        p_build_file_url: datos.urlArchivoCompilacion || '',
        p_test_notes: datos.notas || '',
        p_server_name: datos.servidor || null,
      });

    if (error) throw error;
    if (!data[0]?.success) {
      throw new Error(data[0]?.error_msg || 'Error desconocido');
    }

    console.log('Despliegue creado:', data[0].deployment_id);
    return true;
  } catch (error) {
    console.error('Error en crearDespliegue:', error);
    throw error;
  }
}

export async function obtenerDespliegues(idClienteEmpresa: string) {
  try {
    const { data, error } = await supabase
      .from('deployments')
      .select('*, platform:deployment_platforms(*)')
      .eq('client_company_id', idClienteEmpresa)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerDespliegues:', error);
    return [];
  }
}

export async function enviarDespliegue(idDespliegue: string, idUsuario: string) {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'submitted',
        submitted_by: idUsuario,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', idDespliegue);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function aprobarDespliegue(idDespliegue: string, idUsuario: string) {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'approved',
        approved_by: idUsuario,
        approved_at: new Date().toISOString(),
      })
      .eq('id', idDespliegue);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function rechazarDespliegue(idDespliegue: string, idUsuario: string) {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'rejected',
        approved_by: idUsuario,
        approved_at: new Date().toISOString(),
      })
      .eq('id', idDespliegue);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function marcarEnVivo(idDespliegue: string) {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'live',
        live_at: new Date().toISOString(),
      })
      .eq('id', idDespliegue);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function revertirDespliegue(idDespliegue: string, motivo: string) {
  try {
    const { error } = await supabase
      .from('deployments')
      .update({
        status: 'rollback',
        rollback_at: new Date().toISOString(),
        rollback_reason: motivo,
      })
      .eq('id', idDespliegue);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
