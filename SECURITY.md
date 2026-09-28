# Security Policy

Circuit Commons is a mainnet prototype and has not received an independent audit.

## Security properties

- Pod control is resolved from the canonical TapeOut Circuit owner.
- Registry publishing and status changes require current Circuit ownership.
- Router execution requires the exact Manifest price.
- Revenue shares are bounded to 10,000 basis points.
- Revenue uses pull-payment accounting rather than immediate external transfers.
- Router execution has a reentrancy lock.
- A Circuit can have only one Factory-created Pod.
- Pod calls are restricted to the current Circuit owner.
- The frontend never requests or stores a primary-wallet private key.

## Trust assumptions

- The configured TapeOut ownership adapter must return the canonical owner.
- The Processor address must implement the expected eval(uint256,bytes) interface.
- The Container adapter must faithfully expose the official Circuit Container.
- Manifest hosting must return the exact JSON whose hash is registered on-chain.

## Out of scope

- Guaranteed yield or investment returns.
- Recovery from a compromised Circuit owner wallet.
- Safety of third-party contracts called through a Pod Account.
- Production custody of substantial public funds before an independent audit.

Please report vulnerabilities privately to the repository owner rather than opening a public exploit report.

