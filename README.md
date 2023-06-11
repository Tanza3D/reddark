# [Reddark](https://reddark.untone.uk/)
A website to watch subreddits go dark in realtime.

## Subreddits
Reddark pulls the list of participating subreddits from the [threads on r/ModCoord](https://reddit.com/r/ModCoord/comments/1401qw5/incomplete_and_growing_list_of_participating/). If you are the moderator of a sub that is going dark and that is not displayed on Reddark, you can [message the r/ModCoord moderators](https://reddit.com/message/compose?to=/r/ModCoord) to request that the subreddit is added to the relevant thread.

## Technologies
This is using Express to host the frontend and Socket.io to serve data. Quite simple code, and not too hard to get your head around.
This is based on the [Original work of D4llo](https://github.com/D4llo/Reddark) with permission.


## Deploying

A Docker container can be found at `ghcr.io/Tanza3D/reddark`, this can be used by running the following:
`docker run ghcr.io/Tanza3D/reddark -p 8312:8312` and acessing the port at [http://localhost:8312](https://localhost:8312)
set the `ORIGIN` env variable, to the site url

### Kubernetes
A helm chart exists, which can be deployed by the following:
`helm repo add 0xemma https://0xemma.github.io/helm-charts`
`helm install reddark 0xemma/reddark`
