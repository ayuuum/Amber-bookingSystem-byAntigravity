# Haukuri Pro システム詳細設計書

## 1. 全体アーキテクチャ (System Architecture)

LINEを起点としたUX（LIFF）と、拡張性を重視したバックエンドレス/サーバーレス構成です。

```mermaid
graph TD
    %% Styling
    classDef client fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef front fill:#fff3e0,stroke:#e65100,stroke-width:2px;
    classDef edge fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef backend fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef ext fill:#fafafa,stroke:#616161,stroke-width:1px,stroke-dasharray: 5 5;

    subgraph Client [Device Layer]
        LineApp([User: LINE App / LIFF]):::client
        Browser([Admin: Web Browser]):::client
    end

    subgraph Frontend [Presentation Layer: Next.js]
        NextApp[App Router / UI Components]:::front
    end

    subgraph EdgeFunctions [Logic Layer: Edge Functions]
        API_Book[Booking API]:::edge
        API_AI[AI Agent]:::edge
        API_Sync[Sync Engine]:::edge
        API_Line[Messaging Engine]:::edge
    end

    subgraph Backend [Data Layer: Supabase BaaS]
        SB_Auth[Supabase Auth]:::backend
        SB_DB[(PostgreSQL + RLS)]:::backend
        SB_Vec[(pgvector)]:::backend
    end

    subgraph External [External Eco-system]
        LinePlat[LINE Platform]:::ext
        G_Cal[Google Calendar API]:::ext
    end

    %% Flows
    LineApp -->|Open LIFF| NextApp
    Browser -->|Admin Access| NextApp
    
    NextApp -->|Fetch/Mutate| API_Book
    API_Book -->|CRUD| SB_DB
    
    API_Book -->|Trigger| API_Line
    API_Line -->|Send Push| LinePlat
    LinePlat -->|Notify| LineApp
    
    API_Sync -->|Sync| G_Cal
    API_Sync <-->|Update Availability| SB_DB
    
    API_AI -->|Context Retrieval| SB_Vec
    
    class Client client
    class Frontend front
    class EdgeFunctions edge
    class Backend backend
```

---

## 2. データベース設計 (ER Diagram)

Supabase (PostgreSQL) を使用し、マルチテナント対応のためにRLS (Row Level Security) を適用します。

```mermaid
erDiagram
    profiles ||--o{ bookings : "makes"
    stores ||--o{ services : "offers"
    stores ||--o{ bookings : "manages"
    services ||--o{ bookings : "includes"

    profiles {
        uuid id PK "auth.users reference"
        text role "admin | staff | customer"
        text full_name
        text email
        text phone
    }

    stores {
        uuid id PK
        text name
        jsonb settings "Business hours, etc."
    }

    services {
        uuid id PK
        uuid store_id FK
        text name
        int duration_minutes
        int price
    }

    bookings {
        uuid id PK
        uuid store_id FK
        uuid customer_id FK "Nullable (Guest/Deleted)"
        uuid service_id FK
        timestamp start_time
        timestamp end_time
        text status "pending | confirmed | ..."
        text notes
    }
```

---

## 3. 予約フロー (Booking Flow)

ユーザーがLINEから予約を行い、完了通知を受け取るまでのプロセスです。

```mermaid
sequenceDiagram
    participant User as User (LINE)
    participant LIFF as LIFF / Frontend
    participant API as Booking API
    participant DB as Supabase DB
    participant LINE as LINE Platform

    User->>LIFF: 予約画面を開く
    LIFF->>LIFF: LINEログイン & プロフィール取得
    LIFF->>User: フォーム表示 (名前/Email自動入力)
    User->>LIFF: 日時・サービス選択 & 送信
    
    LIFF->>API: POST /api/bookings
    API->>API: バリデーション & 日時変換
    API->>DB: INSERT bookings (pending)
    DB-->>API: Success (Booking ID)
    
    opt Notification
        API->>LINE: Messaging API (Push)
        LINE-->>User: 「予約が確定しました」
    end
    
    API-->>LIFF: 200 OK
    LIFF->>User: 完了画面表示
```

---

## 4. 空き枠計算ロジック (Availability Logic)

現状はシンプルな重複チェックですが、将来的には以下のロジックで判定します。

1.  **店舗営業時間**: `stores.settings` から営業時間を取得。
2.  **サービス所要時間**: `services.duration_minutes` を取得。
3.  **既存予約**: `bookings` テーブルから対象日の予約を取得 (`status != cancelled`)。
4.  **Googleカレンダー**: `Sync Engine` 経由でブロックされている外部予定を取得。
5.  **判定**:
    *   開始時刻 〜 終了時刻 が営業時間内か？
    *   既存予約またはGoogle予定と重複（Overlay）していないか？

$$
Available(t) = (StoreOpen \le t < t + duration \le StoreClose) \land \nexists b \in Bookings, (b.start < t + duration \land b.end > t)
$$

---

## 5. 画面遷移図 (Screen Transitions)

```mermaid
graph LR
    subgraph UserFlow [ユーザー/予約フロー]
        Entry[LP / LINE Menu] --> Booking[予約ウィザード]
        Booking --> Step1[1. サービス選択]
        Step1 --> Step2[2. 日時選択]
        Step2 --> Step3[3. お客様情報 (LINE Autofill)]
        Step3 --> Step4[4. 内容確認]
        Step4 --> Complete[完了画面]
    end

    subgraph AdminFlow [管理者フロー]
        Login[ログイン] --> Dashboard[ダッシュボード]
        Dashboard --> BookingList[予約一覧]
        Dashboard --> Calendar[カレンダー]
        Dashboard --> Settings[店舗設定]
    end
```
