import { supabase } from './supabase';

export async function subirTestBuild(datos: any) {
  try {
    console.log('Subiendo test build:', datos);

    const { data, error } = await supabase
      .rpc('insert_test_build', {
        p_client_company_id: datos.idClienteEmpresa,
        p_platform_id: datos.idPlataforma,
        p_version: datos.version,
        p_build_number: datos.numeroCompilacion,
        p_uploaded_by: datos.idUsuario,
        p_test_url: datos.urlTest || '',
        p_build_file_url: datos.urlArchivoCompilacion || '',
        p_test_notes: datos.notas || '',
      });

    if (error) throw error;
    if (!data[0]?.success) {
      throw new Error(data[0]?.error_msg || 'Error desconocido');
    }

    console.log('Test build subido:', data[0].test_build_id);
    return true;
  } catch (error) {
    console.error('Error en subirTestBuild:', error);
    throw error;
  }
}

export async function obtenerTestBuilds(idClienteEmpresa: string) {
  try {
    const { data, error } = await supabase
      .from('test_builds')
      .select('*, platform:test_platforms(*)')
      .eq('client_company_id', idClienteEmpresa)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerTestBuilds:', error);
    return [];
  }
}

export async function marcarProbando(idTestBuild: string) {
  try {
    const { error } = await supabase
      .from('test_builds')
      .update({ status: 'testing' })
      .eq('id', idTestBuild);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function marcarCompletado(idTestBuild: string) {
  try {
    const { error } = await supabase
      .from('test_builds')
      .update({ status: 'completed' })
      .eq('id', idTestBuild);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function marcarFallido(idTestBuild: string) {
  try {
    const { error } = await supabase
      .from('test_builds')
      .update({ status: 'failed' })
      .eq('id', idTestBuild);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export async function eliminarTestBuild(idTestBuild: string) {
  try {
    const { error } = await supabase
      .from('test_builds')
      .delete()
      .eq('id', idTestBuild);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
