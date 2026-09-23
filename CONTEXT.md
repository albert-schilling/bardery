# Bardery

An interactive storytelling app where AI writes and illustrates a story and the reader decides how it continues.

## Language

### People

**Account**:
The login-holding owner of the app usage, typically a parent. Owns one or more Profiles.
_Avoid_: User (ambiguous between Account and Profile)

**Profile**:
A person, typically a child, for whom stories are created. Its birth date places it in an Age Band.
_Avoid_: Child, kid, sub-account

**Age Band**:
One of a fixed set of non-overlapping age ranges that bounds what content is appropriate. A Story keeps the Age Band it was started in.
_Avoid_: Age group, age range

### Stories

**Story**:
A tale created for one Profile, starring one or more Heroes. Branches into a tree of Parts whenever an earlier Choice is decided differently.
_Avoid_: Tale, book

**Part**:
One generated unit of a Story: text plus one illustration, followed by a Choice unless it is an Ending.
_Avoid_: Chapter, section, page, step

**Choice**:
The question after a Part about how the Story continues, answered by picking one of three Options or writing free text.
_Avoid_: Decision point, prompt

**Option**:
One of the three suggested continuations offered at a Choice.
_Avoid_: Alternative, suggestion

**Storyline**:
One path through a Story from its first Part to a last Part. The Storyline extended most recently is the one the reader sees by default.
_Avoid_: Version, branch, path

**Ending**:
A Part that concludes a Storyline and has no Choice. Steered by the app toward a length suited to the Age Band within a hard limit, or requested by the reader once a minimum length is reached.
_Avoid_: Finale, conclusion

**Hero**:
A character that a Story is about, belonging to one Profile. A Hero can star in later Stories and carries forward what happened in each earlier Story: in its most recently finished Storyline, or if none is finished, its most recently extended one.
_Avoid_: Protagonist, character (when meaning a Hero)

**Story Language**:
The language a Story is written and narrated in, chosen per Profile. A Story keeps the Story Language it was started in.
_Avoid_: Locale (that's the app's interface language)

### Illustration

**House Style**:
The single illustration style used for all Stories, adapted to the Age Band (e.g. Heroes look younger for younger readers).
_Avoid_: Theme, art style (as a per-Story choice)

### Listening

**Narrator**:
One of three voices that can read a Story aloud.
_Avoid_: Speaker, voice actor
