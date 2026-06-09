import { supabase } from './supabase';

export async function crearReporte(datos: any) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert({
        admin_company_id: datos.idEmpresaAdmin,
        client_company_id: datos.idClienteEmpresa || null,
        title: datos.titulo,
        report_type: datos.tipo,
        period_start: datos.fechaInicio,
        period_end: datos.fechaFin,
        generated_by: datos.idUsuario,
        data: datos.datosReporte || {},
      })
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error en crearReporte:', error);
    throw error;
  }
}

export async function obtenerReportes(idEmpresaAdmin: string) {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('admin_company_id', idEmpresaAdmin)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en obtenerReportes:', error);
    return [];
  }
}

export async function generarReporteTickets(
  idEmpresaAdmin: string,
  idCliente: string | null,
  fechaInicio: string,
  fechaFin: string,
  idUsuario: string
) {
  try {
    let query = supabase
      .from('tickets')
      .select('status, priority, category, created_at')
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`);

    if (idCliente) {
      query = query.eq('company_id', idCliente);
    }

    const { data: tickets, error } = await query;

    if (error) throw error;

    const data = {
      total_tickets: tickets?.length || 0,
      por_estado: agrupar(tickets || [], 'status'),
      por_prioridad: agrupar(tickets || [], 'priority'),
      por_categoria: agrupar(tickets || [], 'category'),
    };

    return crearReporte({
      idEmpresaAdmin,
      idClienteEmpresa: idCliente,
      titulo: `Reporte de Tickets: ${fechaInicio} a ${fechaFin}`,
      tipo: 'tickets',
      fechaInicio,
      fechaFin,
      idUsuario,
      datosReporte: data,
    });
  } catch (error) {
    console.error('Error en reporte tickets:', error);
    throw error;
  }
}

export async function generarReporteDespliegues(
  idEmpresaAdmin: string,
  idCliente: string | null,
  fechaInicio: string,
  fechaFin: string,
  idUsuario: string
) {
  try {
    let query = supabase
      .from('deployments')
      .select('status, created_at')
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`);

    if (idCliente) {
      query = query.eq('client_company_id', idCliente);
    }

    const { data: despliegues, error } = await query;

    if (error) throw error;

    const lista = despliegues || [];
    const data = {
      total_despliegues: lista.length,
      por_estado: agrupar(lista, 'status'),
      despliegues_en_vivo: lista.filter((d: any) => d.status === 'live').length,
      despliegues_rechazados: lista.filter((d: any) => d.status === 'rejected').length,
    };

    return crearReporte({
      idEmpresaAdmin,
      idClienteEmpresa: idCliente,
      titulo: `Reporte de Despliegues: ${fechaInicio} a ${fechaFin}`,
      tipo: 'deployments',
      fechaInicio,
      fechaFin,
      idUsuario,
      datosReporte: data,
    });
  } catch (error) {
    console.error('Error en reporte despliegues:', error);
    throw error;
  }
}

export async function generarReporteTests(
  idEmpresaAdmin: string,
  idCliente: string | null,
  fechaInicio: string,
  fechaFin: string,
  idUsuario: string
) {
  try {
    let query = supabase
      .from('test_builds')
      .select('status, created_at')
      .gte('created_at', `${fechaInicio}T00:00:00`)
      .lte('created_at', `${fechaFin}T23:59:59`);

    if (idCliente) {
      query = query.eq('client_company_id', idCliente);
    }

    const { data: tests, error } = await query;

    if (error) throw error;

    const lista = tests || [];
    const data = {
      total_tests: lista.length,
      por_estado: agrupar(lista, 'status'),
      tests_completados: lista.filter((t: any) => t.status === 'completed').length,
      tests_fallidos: lista.filter((t: any) => t.status === 'failed').length,
    };

    return crearReporte({
      idEmpresaAdmin,
      idClienteEmpresa: idCliente,
      titulo: `Reporte de Tests: ${fechaInicio} a ${fechaFin}`,
      tipo: 'testing',
      fechaInicio,
      fechaFin,
      idUsuario,
      datosReporte: data,
    });
  } catch (error) {
    console.error('Error en reporte tests:', error);
    throw error;
  }
}

export async function eliminarReporte(idReporte: string) {
  try {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', idReporte);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

function agrupar(items: any[], propiedad: string) {
  return items.reduce(
    (acc, item) => {
      const valor = item[propiedad] || 'desconocido';
      acc[valor] = (acc[valor] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}
