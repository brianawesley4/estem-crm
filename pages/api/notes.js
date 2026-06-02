import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { lead_id } = req.query
    if (!lead_id) return res.status(400).json({ error: 'Missing lead_id' })
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  if (req.method === 'POST') {
    const { lead_id, text, type, user_name } = req.body
    if (!lead_id || !text) return res.status(400).json({ error: 'Missing fields' })
    const { data, error } = await supabase.from('notes').insert({
      lead_id,
      text,
      type: type || 'note',
      user_name: user_name || 'Bri',
      created_at: new Date().toISOString()
    })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  res.status(405).json({ error: 'Method not allowed' })
}
