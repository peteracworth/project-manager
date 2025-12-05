import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: staticInfo, error } = await supabase
    .from('static_info')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching static info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staticInfo });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const { data: staticInfo, error } = await supabase
    .from('static_info')
    .insert([body])
    .select()
    .single();

  if (error) {
    console.error('Error creating static info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staticInfo });
}
