# danish-squares-backend


## Deployment
### If you need to restart the vps

```bash
pm2 list
pm2 delete [id]
pm2 logs language-squares-backend
pm2 start npm --name language-squares-backend -- run serve

```