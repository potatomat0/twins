1. change the scoring method to the one used in the pca_evaluator notebook
2. adjust the supabase schema for profiles.user.personality_fingerprint values and settings 
3. wire the tensorflow model to the react native app so that once user finish answering the questionnaire and creating their account, the app will also push the actual personality_fingerprint values to the database. 
4. Design database structure for the user entity, currently the schema is very simple and is not ready for future features. .supabase.md and ./supbabase_current_schema.md explains the supabase strucuture, future development require document update for these files with specific progress timeline. 
5. Add trigger and Edge Functions on Supabase, final result should be a RESTful API route that look up a selected list of user with chunks of pagination (weighted by age groups, gender, archetypes...) that has the closest matching personality_fingerprint using cosine_similarity for comparision. 
6. with the available data and backend service, we should now develop a dashboard screen, tinder-style for swiping and selecting/(or liking,adding to contact list, we'll figure this out later) users. 

Future consideration: Cloud service for media like cloudinary, dont know if supabase has this or not. 
