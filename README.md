# K8s Quantity Converter

**Live demo:** https://babug01.github.io/k8s-quantity-converter/

Paste any Kubernetes resource quantity string (`500m`, `128Mi`, `1e9`, `2.5Gi`, ...) and see exactly
what it means in raw base units, plus a plain-language line. Built specifically to call out the most
common real-world Kubernetes resource mistake: `m`, `M`, and `Mi` all look similar and mean three
completely different things depending on whether you're setting CPU or memory. Runs entirely in the
browser; nothing you type ever leaves your machine.

## Features

- **Full suffix grammar** — binary (`Ki`/`Mi`/`Gi`/`Ti`/`Pi`/`Ei`, powers of 1024) and decimal SI
  (`n`/`u`/`m`/none/`k`/`M`/`G`/`T`/`P`/`E`, powers of 10), plus scientific notation (`1e9`) as its
  own standalone grammar branch, matching the real `resource.Quantity` suffix rules
- **Separate CPU and Memory tabs** — since `500m` (CPU, half a core) and `500M` (memory, 500
  megabytes) and `500Mi` (memory, ~524 megabytes) are all different values, and mixing them up in a
  request/limit is an easy, common mistake
- **Live conversion** to raw base units (cores or bytes), the common human-readable forms (cores /
  millicores / nanocores for CPU; binary and decimal human units, Mi, Gi for memory), and a
  plain-language summary line
- Clear errors for an unrecognized suffix instead of a silent `NaN`
- A suffix reference table covering every valid suffix and what it means

## Why I built this

I've lost time before to a typo'd `500M` where I meant `500Mi` in a resource limit, and jwt.io-style
single-purpose tools for k8s quantity strings didn't really exist. This is also one piece of a larger
internal DevOps tool I built at work consolidating the utility pages a platform engineer reaches for
daily into one place — this repo is the quantity converter piece, cleaned up and open-sourced on its
own.

## Tech Stack

- [React](https://react.dev/) + [Vite](https://vitejs.dev/) — no other runtime dependencies; parsing
  is a small hand-written function implementing the `resource.Quantity` suffix grammar directly

## Running locally

```bash
git clone https://github.com/Babug01/k8s-quantity-converter.git
cd k8s-quantity-converter
npm install
npm run dev
```

## License

MIT — see [LICENSE](LICENSE).
