export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            bookings: {
                Row: {
                    id: string
                    store_id: string
                    customer_id: string | null
                    service_id: string
                    start_time: string
                    end_time: string
                    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
                    customer_name: string | null
                    customer_email: string | null
                    customer_phone: string | null
                    notes: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    customer_id?: string | null
                    service_id: string
                    start_time: string
                    end_time: string
                    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
                    customer_name?: string | null
                    customer_email?: string | null
                    customer_phone?: string | null
                    notes?: string | null
                    created_at?: string
                }
                Update: {
                    created_at?: string
                    customer_email?: string | null
                    customer_id?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    end_time?: string
                    id?: string
                    notes?: string | null
                    service_id?: string
                    staff_id?: string | null
                    start_time?: string
                    status?: string | null
                    store_id?: string
                    google_event_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "bookings_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "customers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_service_id_fkey"
                        columns: ["service_id"]
                        isOneToOne: false
                        referencedRelation: "services"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_staff_id_fkey"
                        columns: ["staff_id"]
                        isOneToOne: false
                        referencedRelation: "staff"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            customers: {
                Row: {
                    address: string | null
                    created_at: string
                    id: string
                    line_user_id: string | null
                    name: string
                    notes: string | null
                    phone: string
                    store_id: string
                }
                Insert: {
                    address?: string | null
                    created_at?: string
                    id?: string
                    line_user_id?: string | null
                    name: string
                    notes?: string | null
                    phone: string
                    store_id: string
                }
                Update: {
                    address?: string | null
                    created_at?: string
                    id?: string
                    line_user_id?: string | null
                    name?: string
                    notes?: string | null
                    phone?: string
                    store_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "customers_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            staff: {
                Row: {
                    created_at: string
                    google_calendar_id: string | null
                    id: string
                    is_active: boolean | null
                    name: string
                    store_id: string
                }
                Insert: {
                    created_at?: string
                    google_calendar_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    name: string
                    store_id: string
                }
                Update: {
                    created_at?: string
                    google_calendar_id?: string | null
                    id?: string
                    is_active?: boolean | null
                    name?: string
                    store_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "staff_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    }
                ]
            }
            profiles: {
                Row: {
                    id: string
                    role: 'admin' | 'staff' | 'customer'
                    full_name: string | null
                    phone: string | null
                    email: string | null
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    role?: 'admin' | 'staff' | 'customer'
                    full_name?: string | null
                    phone?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    role?: 'admin' | 'staff' | 'customer'
                    full_name?: string | null
                    phone?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            services: {
                Row: {
                    id: string
                    store_id: string
                    name: string
                    description: string | null
                    duration_minutes: number
                    price: number
                    is_active: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    store_id: string
                    name: string
                    description?: string | null
                    duration_minutes: number
                    price: number
                    is_active?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    store_id?: string
                    name?: string
                    description?: string | null
                    duration_minutes?: number
                    price?: number
                    is_active?: boolean
                    created_at?: string
                }
            }
            stores: {
                Row: {
                    id: string
                    name: string
                    address: string | null
                    phone: string | null
                    email: string | null
                    settings: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    settings?: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    settings?: Json
                    created_at?: string
                }
            }
        }
    }
}
