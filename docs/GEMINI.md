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

- On user cue 'git push proceed', follow this sequence:
  - 1. Run `git status`.
  - 2. Run `git add .` to stage all changes.
  - 3. Analyze changes and suggest a commit message.
  - 4. Ask for user's approval on the message, then run `git commit`.
  - 5. Run `git push`.

- When asked to review a markdown (.md) file:
  - 1. Read the file.
  - 2. Update the 'DOCUMENT AUDIT' block at the top.
  - 3. Set 'Last Reviewed' to the current IST time by fetching it with a command.
  - 4. Set 'Reviewer' to 'Santosh (with Gemini)'.
  - 5. Present the updated content for user approval before saving.

- On user cue 'end the work' or similar, follow this 'End of Day' workflow:
  - 1. Run `git diff` to see changed files and ask user if docs need updating.
  - 2. Run `git status` to check for uncommitted work.
  - 3. Run `git log` to summarize today's commits.
  - 4. Suggest final actions like committing or pushing changes 

- **`end of work also make a zip fil of the project in local`**
 - **Action** make a zip file of project by python: `python ../makezip.py`