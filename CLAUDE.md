# Owner Real Estate Agent SaaS

- @README.md
- @frontend/package.json
- @docs/guides/project_naming_rules.md

## Build & Run

### Environment

- Start Supabase: `supabase start`
- Stop Supabase: `supabase stop`
- Reset Database: `supabase db reset`
- Supabase Status: `supabase status` (Get anon key)

### Frontend

- Install Dependencies: `cd frontend && npm install`
- Start Expo: `cd frontend && npx expo start`
- Run on iOS: `cd frontend && npm run ios`
- Run on Android: `cd frontend && npm run android`
- Run on Web: `cd frontend && npx expo start --web`

### Code Quality

- Lint: `cd frontend && npm run lint`
- Type Check: `cd frontend && npx tsc --noEmit`
- Format: `npx prettier --write "**/*.{js,jsx,ts,tsx,json,css}"`

## Architecture Details

### Tech Stack

- **Frontend**: React Native 0.81.5, Expo 54, TypeScript 5.9.2
- **Backend**: Supabase (PostgreSQL 17), GoTrue (Auth), Storage
- **Styling**: @expo/vector-icons (FontAwesome5, MaterialIcons, Ionicons)

### Database Schema (Phase 1)

- **properties**: `id`, `agent_id`, `address`, `district`, `total_area`, `building_age`, `transcript_data`
- **property_photos**: `id`, `property_id`, `storage_path`, `display_order`
- **clients**: `id`, `agent_id`, `name`, `phone`, `email`, `preferences`
- **property_appointments**: `id`, `property_id`, `client_id`, `scheduled_at`, `status`
- **Security**: RLS enabled. Agents can only access their own data (`agent_id = auth.uid()`).

### Frontend API (`frontend/src/lib/supabase.ts`)

- **Auth**: `signUp`, `signIn`, `signOut`, `getCurrentUser`
- **Properties**: `createProperty`, `getUserProperties`, `updateProperty`, `deleteProperty`

### Local Services

- API Gateway: http://localhost:54321
- Supabase Studio: http://localhost:54323
- Expo Dev Server: http://localhost:8081
