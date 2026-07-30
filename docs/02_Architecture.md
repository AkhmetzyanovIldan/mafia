# Project Mafia
## 02. Architecture

---

# High-Level Architecture

```text
Telegram Mini App
        │
        ▼
React Client
        │
   WebSocket
        │
        ▼
Backend
        │
 ┌──────┼─────────────┐
 │      │             │
 ▼      ▼             ▼
Room  Connection   Voice
Manager Manager    Manager
        │
        ▼
   GameManager
        │
 ┌──────┼─────────────┐
 │      │             │
 ▼      ▼             ▼
State Rule      Timer
Machine Engine  Manager
        │
        ▼
    RoomState
        │
        ▼
 WebSocket Broadcast
        │
        ▼
React Rendering
```

---

# Frontend

```text
frontend/

src/
 ├── components/
 ├── screens/
 ├── services/
 ├── hooks/
 ├── store/
 ├── assets/
 ├── types/
 └── App.tsx
```

GameScreen

```text
GameScreen
├── Background
├── Table
├── Players
├── Timer
├── Voice
├── OverlayManager
├── ModalManager
├── EffectsManager
└── Notifications
```

---

# Backend

```text
backend/

src/
├── config/
├── websocket/
├── rooms/
├── game/
├── voice/
├── utils/
├── types/
└── index.ts
```

---

# Backend Modules

```text
Backend
│
├── ConnectionManager
├── RoomManager
├── GameManager
├── VoiceManager
└── Logging
```

---

# GameManager

```text
GameManager
│
├── StateMachine
├── RuleEngine
├── TimerManager
├── VoiceManager
└── RoomState Builder
```

---

# Game Layer

```text
game/

├── GameManager
├── StateMachine
├── RuleEngine
├── TimerManager
├── GameEvents
├── actions/
├── roles/
├── rules/
├── phases/
└── state/
```

---

# Room

```text
Room

├── RoomId
├── Settings
├── Players
├── Spectators
├── RoomState
└── GameManager
```

---

# Player

```text
Player

├── id
├── telegramId
├── nickname
├── seat
├── role
├── alive
├── connected
├── ready
└── websocket
```

---

# Spectator

```text
Spectator

├── id
├── connected
├── websocket
└── voicePermissions
```

---

# RoomState

```text
RoomState

├── roomId
├── phase
├── timer
├── day
├── players
├── spectators
├── overlays
├── events
├── settings
├── winner
└── voice
```

---

# State Machine

```text
Lobby
    │
    ▼
Role Reveal
    │
    ▼
Night
    │
    ▼
Morning
    │
    ▼
Discussion
    │
    ▼
Voting
    │
    ▼
Execution
    │
    ▼
Night
```

---

# Rule Engine

```text
RuleEngine

├── Role Rules
├── Night Actions
├── Voting
├── Conflict Resolver
├── Win Conditions
└── Validation
```

---

# Timer Manager

```text
TimerManager

├── NightTimer
├── SpeechTimer
├── VotingTimer
├── DelayTimer
└── TransitionTimer
```

---

# Voice Architecture

```text
GameManager
      │
      ▼
VoiceManager
      │
      ▼
VoicePolicy
      │
      ▼
LiveKit
```

---

# Voice Channels

```text
LiveKit

├── Public Channel
└── Mafia Channel
```

---

# Voice Flow

```text
Phase Changed
      │
      ▼
GameManager
      │
      ▼
VoiceManager
      │
      ▼
VoicePolicy
      │
      ▼
VoicePermissions
      │
      ▼
LiveKit
```

---

# Voice Policy

```text
LobbyPolicy

DiscussionPolicy

NightPolicy

GameOverPolicy
```

---

# Reconnection

```text
Disconnected
      │
      ▼
ConnectionManager
      │
      ▼
Find Player
      │
      ▼
Bind WebSocket
      │
      ▼
Send RoomState
      │
      ▼
Continue Game
```

---

# Room Lifecycle

```text
Create Room
      │
      ▼
Waiting Players
      │
      ▼
Ready
      │
      ▼
Game Started
      │
      ▼
Game Finished
      │
      ▼
Room Closed
```

---

# Player Lifecycle

```text
Join
 │
 ▼
Seat
 │
 ▼
Ready
 │
 ▼
Playing
 │
 ├──────────────┐
 │              │
 ▼              ▼
Disconnected  Dead
 │              │
 └──────┬───────┘
        ▼
 Game Over
```

---

# Communication

```text
Client

↓

WebSocket

↓

ConnectionManager

↓

MessageRouter

↓

GameManager

↓

RuleEngine

↓

RoomState

↓

Broadcast

↓

Client
```

---

# Rendering

```text
RoomState

↓

Store

↓

React

↓

GameScreen

↓

Overlay

↓

Effects
```

---

# Server

```text
VPS

├── Backend
├── LiveKit
└── Active Rooms
```

---

# Horizontal Scaling

```text
Internet
      │
      ▼
LoadBalancer
      │
 ┌────┴────┐
 ▼         ▼
Backend1 Backend2
 │         │
Rooms     Rooms
```

---

# Data Storage

```text
Memory

├── Active Rooms
├── Game State
├── Timers
└── Connections
```

```text
Database

├── Users
├── Statistics
├── History
├── Ratings
├── Inventory
└── Settings
```

---

# Logging

```text
Logs

├── Server
├── Room
├── Game
├── Voice
├── WebSocket
└── Errors
```

---

# Monitoring

```text
Metrics

├── Online Players
├── Active Rooms
├── CPU
├── RAM
├── WebSocket
└── LiveKit
```

---

# Architectural Principles

```text
Server
        │
        ▼
GameManager
        │
        ▼
RoomState
        │
        ▼
Client
```

```text
One Room
      │
      ▼
One GameManager
```

```text
One Module
      │
      ▼
One Responsibility
```

```text
Client

Display Only
```

```text
Server

Game Logic Only
```

```text
Voice

Independent
```

```text
GameScreen

Permanent
```

```text
Disconnect

≠

Leave Game
```

```text
Room

Independent
```

```text
Game State

Memory Only
```
# 02A_Architecture_Extensions.md

---

# Monorepo Structure

```text
mafia-project/

├── frontend/
├── backend/
├── game-engine/
├── shared/
├── package.json
├── package-lock.json
├── tsconfig.base.json
└── README.md
```

---

# Shared Package

```text
shared/

├── dto/
├── enums/
├── events/
├── interfaces/
├── constants/
├── types/
└── utils/
```

Shared package contains only common contracts.

Business logic is prohibited.

---

# Dependency Graph

```text
Frontend
      │
      ▼
Shared

Backend
      │
      ▼
Shared

Game Engine
      │
      ▼
Shared
```

```text
Frontend

does NOT depend on Backend
```

```text
Game Engine

does NOT depend on Frontend
```

```text
Shared

depends on nothing
```

---

# Backend Composition

```text
Server

↓

Configuration

↓

ConnectionManager

↓

RoomManager

↓

GameManager

↓

RuleEngine

↓

RoomState

↓

Broadcast
```

---

# Dependency Injection

```text
Server

↓

RoomManager

↓

Room

↓

GameManager

↓

StateMachine

RuleEngine

TimerManager

VoiceManager
```

All dependencies are injected during room creation.

No module creates its own dependencies.

---

# WebSocket Protocol

## Client → Server

```text
CONNECT

DISCONNECT

CREATE_ROOM

JOIN_ROOM

LEAVE_ROOM

READY

UNREADY

START_GAME

PLAYER_ACTION

VOTE

VOICE_STATE

PING
```

---

## Server → Client

```text
CONNECTED

ROOM_CREATED

ROOM_JOINED

ROOM_UPDATED

PLAYER_JOINED

PLAYER_LEFT

PLAYER_READY

GAME_STARTED

PHASE_CHANGED

ROOM_STATE

ACTION_RESULT

VOTING_STARTED

PLAYER_ELIMINATED

GAME_OVER

VOICE_UPDATED

ERROR

PONG
```

---

# DTO Structure

```text
CreateRoomDto

JoinRoomDto

ReadyDto

PlayerActionDto

VoteDto

RoomStateDto

GameEventDto

VoiceStateDto
```

---

# Client Request Flow

```text
Player

↓

React

↓

Store

↓

WebSocket

↓

Backend

↓

GameManager

↓

RuleEngine

↓

RoomState

↓

Broadcast

↓

Client
```

---

# Server Broadcast Flow

```text
Player Action

↓

Validation

↓

RuleEngine

↓

State Update

↓

RoomState

↓

Broadcast

↓

React Render
```

---

# Create Room Sequence

```text
Client

↓

CREATE_ROOM

↓

RoomManager

↓

Room

↓

GameManager

↓

RoomState

↓

ROOM_CREATED
```

---

# Join Room Sequence

```text
Client

↓

JOIN_ROOM

↓

RoomManager

↓

Player Added

↓

RoomState

↓

ROOM_UPDATED
```

---

# Ready Sequence

```text
READY

↓

GameManager

↓

Update Ready State

↓

RoomState

↓

Broadcast
```

---

# Start Game Sequence

```text
START_GAME

↓

GameManager

↓

Assign Roles

↓

Role Reveal

↓

Night

↓

Broadcast
```

---

# Night Sequence

```text
Night

↓

Receive Actions

↓

RuleEngine

↓

Resolve

↓

Morning

↓

Broadcast
```

---

# Voting Sequence

```text
Voting

↓

Votes

↓

RuleEngine

↓

Result

↓

Execution

↓

Broadcast
```

---

# Reconnection Sequence

```text
Connect

↓

Authenticate

↓

Find Player

↓

Replace Socket

↓

Generate RoomState

↓

ROOM_STATE

↓

Continue
```

---

# Voice Authorization

```text
GameManager

↓

VoiceManager

↓

VoicePolicy

↓

Permissions

↓

LiveKit
```

---

# LiveKit

```text
Backend

↓

Token

↓

Client

↓

Join Room

↓

Join Channels
```

---

# LiveKit Channels

```text
Room

├── Public

├── Mafia

└── Future
```

---

# Voice Permissions

```text
Alive

Speak

Hear
```

```text
Dead

Configured by Rule
```

```text
Spectator

Hear Public

Never Hear Mafia

Never Speak
```

---

# Authentication

```text
Telegram InitData

↓

Validation

↓

User

↓

JWT

↓

WebSocket
```

---

# Authorization

```text
JWT

↓

Player

↓

Room

↓

Permission Check

↓

Action
```

---

# Validation

Every request validates:

```text
Authentication

Room

Player

Phase

Permissions

Payload
```

Invalid requests are rejected.

---

# Security Rules

```text
Client

Never Trusted
```

```text
Server

Always Validates
```

```text
Gameplay

Server Only
```

---

# Error Handling

```text
Transport Errors

↓

Validation Errors

↓

Game Errors

↓

Internal Errors
```

Every error returns unified Error DTO.

---

# Logging

```text
Server

Room

Game

RuleEngine

Voice

WebSocket

Security

Errors
```

---

# Monitoring

```text
Players Online

Rooms

Games

CPU

RAM

Latency

WebSocket

LiveKit
```

---

# Configuration

```text
config/

server

game

voice

security

timers

logging
```

Configuration is loaded once during startup.

---

# Persistence

Memory

```text
Rooms

Players

Timers

Connections

RoomState
```

Database

```text
Users

Statistics

History

Settings

Ratings
```

---

# Extension Rules

New functionality is added by creating:

```text
New Role

New Rule

New Overlay

New DTO

New Event
```

Existing architecture must not be rewritten.

---

# Non-functional Requirements

```text
Server Authoritative

Deterministic Logic

Horizontal Scaling

Stateless Frontend

Independent Rooms

Immutable RoomState

Single Responsibility

Extensible Architecture
```

---

# Architecture Decision Records (ADR)

```text
ADR-001

Server Authoritative
```

```text
ADR-002

Single Permanent GameScreen
```

```text
ADR-003

One Room = One GameManager
```

```text
ADR-004

RoomState is Single Source for Client
```

```text
ADR-005

Only GameManager Broadcasts Updates
```

```text
ADR-006

Voice Separated From Gameplay
```

```text
ADR-007

LiveKit Channel Architecture
```

```text
ADR-008

Disconnect ≠ Leave Game
```

```text
ADR-009

Independent Rooms
```

```text
ADR-010

Memory-Based Active Games
```

```text
ADR-011

Thin React Client
```

```text
ADR-012

Shared Package For Contracts
```

---

# Final Architecture

```text
Telegram

↓

React

↓

WebSocket

↓

ConnectionManager

↓

RoomManager

↓

GameManager

├── StateMachine

├── RuleEngine

├── TimerManager

└── VoiceManager

↓

RoomState

↓

Broadcast

↓

React

↓

LiveKit
```