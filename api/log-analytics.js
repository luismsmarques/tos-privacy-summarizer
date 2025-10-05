import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, url, documentType, textLength, responseTime, success, errorMessage } = req.body;

    // Verificar se o utilizador existe, se não criar
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('device_id', userId)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // Utilizador não existe, criar
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            device_id: userId,
            last_active: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (createError) {
        throw createError;
      }
      user = newUser;
    } else if (userError) {
      throw userError;
    }

    // Inserir resumo
    const { data: summary, error: summaryError } = await supabase
      .from('summaries')
      .insert([
        {
          user_id: user.id,
          url: url || null,
          document_type: documentType || 'other',
          text_length: textLength || 0,
          response_time: responseTime || 0,
          success: success,
          error_message: errorMessage || null
        }
      ])
      .select()
      .single();

    if (summaryError) {
      throw summaryError;
    }

    // Atualizar estatísticas do utilizador
    await supabase
      .from('users')
      .update({
        last_active: new Date().toISOString(),
        total_summaries: supabase.rpc('increment', { 
          table_name: 'users', 
          column_name: 'total_summaries',
          id: user.id 
        }),
        credits_used: supabase.rpc('increment', { 
          table_name: 'users', 
          column_name: 'credits_used',
          id: user.id 
        })
      })
      .eq('id', user.id);

    res.json({ 
      success: true, 
      message: 'Analytics logged successfully',
      summaryId: summary.id 
    });

  } catch (error) {
    console.error('Error logging analytics:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
