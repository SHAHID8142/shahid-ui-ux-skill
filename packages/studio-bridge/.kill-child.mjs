import { Transaction } from "/Volumes/SSD/CODES/SUS/packages/studio-bridge/dist/transaction.js";
const tx = Transaction.prepare("/var/folders/c8/kgc8r31x3b1fzwkd14nq0g_40000gn/T/t0805-fixture-RrYUdq", 'plan-kill', 1, [{"path":"page.tsx","postimage":"export const hero = \"after\";\n"},{"path":"styles.css","postimage":".hero { color: blue; }\n"}]);
tx.apply(1);
process.kill(process.pid, 'SIGKILL');