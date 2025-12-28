#import "/template.typ": *

#[
  #set heading(numbering: none, supplement: [Phụ lục])
  = Phụ lục <phuluc>
]

#set heading(numbering: (..nums) => {
  nums = nums.pos()
  numbering("A.1.", ..nums.slice(1))
}, supplement: [Phụ lục])

#counter(heading).update(1)

== Kết quả phân tích bổ sung của các phiên bản MPBoot2 <pl-2>

#figure(
  image("/images/tbr5_sc100_spr6.png"),
  caption: [So sánh kết quả của TBR5-SC100 với SPR6 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr5_sc100_spr6>

#figure(
  image("/images/tbr5_better_spr6.png"),
  caption: [So sánh kết quả của TBR5-BETTER với SPR6 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr5_better_spr6>

#figure(
  image("/images/tbr6_spr6.png"),
  caption: [So sánh kết quả của TBR6 với SPR6 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr6_spr6>

#figure(
  image("/images/spr6_tnt.png"),
  caption: [So sánh kết quả của SPR6 với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <spr6_tnt>

#figure(
  image("/images/tbr5_tnt.png"),
  caption: [So sánh kết quả của TBR5 với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr5_tnt>

#figure(
  image("/images/tbr5_better_tnt.png"),
  caption: [So sánh kết quả của TBR5-BETTER với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr5_better_tnt>

#figure(
  image("/images/tbr6_tnt.png"),
  caption: [So sánh kết quả của TBR6 với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <tbr6_tnt>

== Kết quả phân tích bổ sung của các phiên bản MPBoot-RL <pl-aco-1>

#figure(
  image("/images/acomul_spr6.png"),
  caption: [So sánh kết quả của ACO-MUL với SPR6 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <acomul_spr6>

#figure(
  image("/images/acomul_tbr5.png"),
  caption: [So sánh kết quả của ACO-MUL với TBR5 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <acomul_tbr5>

#figure(
  image("/images/acomul_tbr5_better.png"),
  caption: [So sánh kết quả của ACO-MUL với TBR5-BETTER trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <acomul_tbr5better>

#figure(
  image("/images/acomul_tnt.png"),
  caption: [So sánh kết quả của ACO-MUL với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
)

#figure(
  image("/images/acoonce_spr6.png"),
  caption: [So sánh kết quả của ACO-ONCE với SPR6 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
) <acoonce_spr6>

#figure(
  image("/images/acoonce_tbr5.png"),
  caption: [So sánh kết quả của ACO-ONCE với TBR5 trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
)

#figure(
  image("/images/acoonce_tbr5_better.png"),
  caption: [So sánh kết quả của ACO-ONCE với TBR5-BETTER trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
)

#figure(
  image("/images/acoonce_tnt.png"),
  caption: [So sánh kết quả của ACO-ONCE với TNT trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
)

#figure(
  image("/images/acomul_acoonce.png"),
  caption: [So sánh kết quả của ACO-MUL với ACO-ONCE trên 115 bộ dữ liệu TreeBASE],
  numbering: phuluc_numbering
)

#pagebreak()
== Kết quả bổ sung của các phiên bản MPBoot-RL với các bộ siêu tham số khác nhau <pl-aco>

#{
  show figure: set block(breakable: true)
  let f(x) = {
    table.cell(fill: rgb(22, 219, 81, int((x - 45) / 7 * 255)))[#x]
  }
  let g(x) = {
    table.cell(fill: rgb(219, 219, 22, int((x - 37) / 6 * 255)))[#x]
  }
  figure(
    table(
      columns: (auto, 1fr, 1fr, 1fr, 1fr),
      inset: 12pt,
      align: (left, horizon, horizon, horizon, horizon),
      table.cell(rowspan: 2, align: horizon + center)[*Cài đặt*], table.cell(colspan: 2)[*Fitch*], table.cell(colspan: 2)[*Sankoff*],
      [DNA], [Protein], [DNA], [Protein],
      [
        ACO-MUL$, space rho = 0.1, space L_0 = 5$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(48), g(38), f(49), g(40),
      [
        ACO-MUL$, space rho = 0.15, space L_0 = 5$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(49), g(39), f(49), g(42),
      [
        ACO-MUL$, space rho = 0.2, space L_0 = 5$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(46), g(40), f(50), g(42),
      [
        ACO-MUL$, space rho = 0.25, space L_0 = 10$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(49), g(40), f(48), g(40),
      [
        *ACO-MUL*$, space rho = 0.25, space L_0 = 15$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(50), g(41), f(51), g(42),
      [
        ACO-MUL$, space rho = 0.3, space L_0 = 15$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(49), g(40), f(47), g(42),
      [
        *ACO-ONCE*$, space rho = 0.1, space L_0 = 5$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(47), g(40), f(49), g(42),
      [
        ACO-ONCE$, space rho = 0.25, space L_0 = 15$ \
        $eta_"NNI" = 0.3, space eta_"SPR" = 0.4, space eta_"TBR" = 0.4$ \
      ], f(48), g(40), f(49), g(40),
    ), 
    caption: [Thống kê số lượng bộ dữ liệu đạt được kết quả tốt nhất (trong 115 bộ TreeBASE) của các phương pháp MPBoot-RL với các bộ siêu tham số khác nhau],
    numbering: phuluc_numbering
  ) 
}
