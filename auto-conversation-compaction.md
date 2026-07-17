# Auto Conversation Compaction Plan

## Overview
This document outlines the plan for implementing an automatic conversation compaction feature in the Anvil project to manage context limits effectively.

## Strategy: Rolling Summary Mechanism
The system will monitor the total number of tokens used in the current conversation session. When a predefined token threshold is reached, the system will trigger a summarization process to condense the history while preserving key information.

## Implementation Phases

### 1. Monitoring & Detection
- Implement a token counter for the conversation history.
- Define configurable thresholds (e.g., 80% of context window).
- Trigger a "Compaction Required" event when thresholds are met.

### 2. Summarization Engine
- Integrate with an LLM to generate a concise summary of the conversation so far.
- Ensure the summary includes:
  - Key topics discussed.
  - Decisions made.
  - User preferences/context established.
  - Pending tasks or questions.

### 3. History Transformation
- Replace the older part of the message history with the generated summary.
- Maintain the most recent messages in their original form to ensure immediate context is preserved.
- Update the message metadata to indicate a "summary point".

### 4. UI/UX Integration
- Provide visual feedback (e.g., a subtle UI indicator) that the conversation has been compacted.
- Allow users to view the "Summary" in the chat history.
- (Optional) Provide a way to "undo" or "expand" the summary if needed.

## Risks & Mitigations
- **Information Loss**: Mitigation involves using high-quality summarization prompts and allowing the user to see the summary.
- **Context Drift**: Mitigation involves periodic re-summarization and ensuring the summary itself doesn't lose critical nuance.
- **Latency**: Mitigation involves running the summarization as a background task or during idle periods.

## Success Criteria
- The conversation remains within the token budget indefinitely.
- The LLM maintains coherence and continuity after compaction.
- Users are aware of the compaction event without it being intrusive.
