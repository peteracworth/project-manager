import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: staticInfo, error } = await supabase
    .from('static_info')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching static info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staticInfo });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;
  const body = await request.json();

  const { data: staticInfo, error } = await supabase
    .from('static_info')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating static info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staticInfo });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id } = await params;

  const { error } = await supabase
    .from('static_info')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting static info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
