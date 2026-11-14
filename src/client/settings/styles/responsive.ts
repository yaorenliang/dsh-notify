/** The narrow-screen fallback for the sound grid. */
export const RESPONSIVE = `/* Below the shell's narrow breakpoint the sound grid stacks into pairs. */
@media (max-width: 560px) {
  .dn-sound__head {
    display: none;
  }

  .dn-sound__row {
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: 8px;
  }

  .dn-sound__name {
    grid-column: 1 / -1;
  }
}

`
