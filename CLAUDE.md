# Voice Player - Claude Instructions

## Git Workflow

**IMPORTANT**: As you work on this project, you must commit changes to Git and push to GitHub with clean commit messages. This ensures we never lose progress and can easily revert if needed.

### Commit Guidelines:
- Make **clean, descriptive commit messages** following conventional commit format
- Commit **frequently** - after completing each feature or fix
- Use **atomic commits** - one logical change per commit
- Always **push to GitHub** after committing

### Commit Message Format:
```
<type>: <brief description>

<optional detailed explanation>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `refactor:` Code refactoring
- `docs:` Documentation
- `style:` Code style/formatting
- `chore:` Maintenance tasks

### Example Workflow:
```bash
# Make changes to code
git add .
git commit -m "feat: add independent pitch control"
git push
```

## Project Info

- **Repo**: https://github.com/mohammed5355/voice-player
- **Tech Stack**: React Native, Expo, TypeScript
- **Language**: Arabic (RTL interface)

## Current Features
- Audio/video file playback
- A-B loop with visual markers
- Playback speed control (0.5x - 2.0x)
- Waveform visualization with seek
- Document picker for file selection
