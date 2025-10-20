-- Enable Row Level Security on the profiles table which seems to be missing RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create appropriate policies for the profiles table
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);