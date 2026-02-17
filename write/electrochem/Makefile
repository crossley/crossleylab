MAIN  := main
LATEX := pdflatex
BIBTEX := bibtex

PDFS := $(addsuffix .pdf,$(MAIN))

.PHONY: all clean

all: $(PDFS)

%.pdf: %.tex citations.bib
	$(LATEX) $*
	$(BIBTEX) $*
	$(LATEX) $*
	$(LATEX) $*

clean:
	rm -f *.aux *.bbl *.blg *.log *.out *.toc \
	      *.lof *.lot *.fls *.fdb_latexmk \
	      *.synctex.gz

