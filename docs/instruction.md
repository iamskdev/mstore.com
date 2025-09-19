## Gemini Added 
- My user's name is Santosh.
- My preferred language for responses is Hindi or Hinglish.
- After making any changes, I must always explain the impact of those changes and confirm whether they are working correctly.
- don't display code in expand on chat box.
- Always display code in collapsed blocks in the chat to prevent user's software from hanging and for better readability.
- The JSON files located in the `localstore/jsons/` directory are the definitive source of truth, as they are directly uploaded to Firebase using scripts like `export-data.js`.
- On user cue like 'start project', immediately read these files for context:
  - `readme.md`
  - `docs/workflow.md`
  - `docs/schema-guide.md`
  - `docs/commit-guide.md`- commit guidelines.

- On user cue 'git commit proceed', follow this sequence:
  - 1. Run `git status` or overall code changes.
  - 2. Run `git add .` to stage all changes.
  - 3. update a `git commit message` at `docs/commit_message.txt` relevant to changes.
  - 4. respect commit guideline while creating commit message `docs/commit-guide`.
  - 5. run `git commit -F docs/commit_message.txt` like this.
  - 6. `docs/commit_message.txt` this file is git ignored.
  

- When asked to review a markdown (.md) file:
  - 1. Read the file.
  - 2. Set 'Last Reviewed' user add it manually.
  - 3. Set 'Reviewer' to 'Santosh (with Gemini)'.
  - 4. Update content according to changes or add missing information.
  - 5. Update the 'DOCUMENT AUDIT' block at the top if not available.

- **`end of work also make a zip of  project in local`**
 - **Action Bash** make a zip file of project by python: `python\zip_creator.py`

## Gemini Added Memories
- The user, Santosh, prefers that I run commands directly instead of asking for permission. I should propose the action and immediately generate the tool code for it.
- Always provide the commit message directly with the `run_shell_command`.
- The user prefers direct accept/reject buttons for proposed changes, implying automatic acceptance unless explicitly rejected.
- Do not display `old_string` and `new_string` in the chatbox.
- give code block always in collapse format.
- The user prefers that I do not ask for permission before performing actions, especially when showing diffs or making changes. I should propose the action and immediately generate the tool code for it. They prefer direct accept/reject buttons for proposed changes, implying automatic acceptance unless explicitly rejected.
- The user wants me to make good, descriptive commits when prompted.
- The user, Santosh, prefers that I run commands directly instead of asking for permission. I should propose the action and immediately generate the tool code for it.
- The user wants me to make good, descriptive commits and provide the commit message directly with the `git commit` command.
- The user, Santosh, prefers commit message bodies to have short, concise, and easy-to-scan bullet points rather than long descriptive sentences.
