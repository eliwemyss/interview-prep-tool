# Interview Prep Tool - Frontend (Next.js)

Modern React/Next.js frontend for the Interview Prep Tool. This app now includes the kanban pipeline, research modal with prep/salary/feedback tabs, and analytics header.

## Features

✨ **Modern Tech Stack**
- Next.js (App Router)
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand for lightweight state management
- Axios for API communication

📋 **Core Features**
- **Pipeline Board**: Kanban across research → offer with quick stage changes
- **Research Modal**: Research, prep checklist, salary intel, and interview feedback tabs
- **Analytics Header**: Stage counts + conversion stats + upcoming interviews
- **Checklist Sync**: Auto-generated prep checklists from the Trigger.dev research job
- **Salary + Feedback**: Persisted salary entries and interview feedback per company

## Getting Started

### Prerequisites
- Node.js 18+
- Backend API running at `http://localhost:3000` (dev) or `https://interviews.himynameiseli.com` (prod)

### Installation

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:3000" > .env.local
npm run dev:local   # or npm run dev:prod to point at prod API
```

Visit http://localhost:3000

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Main dashboard (kanban + modal)
│   ├── dashboard/page.tsx # Alias to main dashboard
│   └── briefing/page.tsx # Legacy briefing view
├── components/          # Board, analytics header, research modal, legacy parts
├── lib/
│   ├── api.ts          # Axios API client
│   ├── store.ts        # Zustand store
│   └── types.ts        # Shared types
```

## Pages

- **Dashboard** (`/` and `/dashboard`) - Kanban pipeline, analytics, research modal
- **Briefing** (`/briefing?company=Name`) - Pre-interview briefing

## API Integration

Communicates with backend at configurable `NEXT_PUBLIC_API_URL`

## Development

```bash
npm run dev           # Start dev server with existing .env.local
npm run dev:local     # Force local API target
npm run dev:prod      # Force prod API target
npm run build         # Build for production
npm start             # Run production server
```

## Deployment

### Vercel

```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_API_URL https://interviews.himynameiseli.com
```

## Troubleshooting

- **API fails**: Check backend is running and NEXT_PUBLIC_API_URL is correct
- **Build errors**: Run `rm -rf .next node_modules && npm install`
- **Port 3000 in use**: `lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9`
